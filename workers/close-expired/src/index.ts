type CloseExpiredResult = {
  cutoff: string;
  candidateCount: number;
  successCount: number;
  failureCount: number;
};

export class CloseExpiredError extends Error {
  constructor(
    message: string,
    readonly result: CloseExpiredResult
  ) {
    super(message);
    this.name = 'CloseExpiredError';
  }
}

async function countExpired(db: D1Database, cutoff: string): Promise<number> {
  const row = await db
    .prepare(
      `SELECT count(*) AS count
         FROM places
        WHERE status = 'active'
          AND ends_at IS NOT NULL
          AND ends_at < ?`
    )
    .bind(cutoff)
    .first<{ count: number }>();

  return Number(row?.count ?? 0);
}

/**
 * 종료일이 지난 장소만 닫는다. closed 행을 다시 active로 만들지 않으므로
 * Cron Trigger가 중복 전달되거나 재시도돼도 같은 결과가 된다.
 */
export async function closeExpired(db: D1Database, cutoff: string): Promise<CloseExpiredResult> {
  const candidateCount = await countExpired(db, cutoff);
  const base = { cutoff, candidateCount };

  if (candidateCount === 0) {
    return { ...base, successCount: 0, failureCount: 0 };
  }

  try {
    await db
      .prepare(
        `UPDATE places
            SET status = 'closed', updated_at = ?
          WHERE status = 'active'
            AND ends_at IS NOT NULL
            AND ends_at < ?`
      )
      .bind(cutoff, cutoff)
      .run();
  } catch (error) {
    throw new CloseExpiredError(errorMessage(error), {
      ...base,
      successCount: 0,
      failureCount: candidateCount
    });
  }

  // D1/CLI가 보고하는 changes 값 대신 실제 잔여 행을 다시 센다.
  const failureCount = await countExpired(db, cutoff);
  const result = {
    ...base,
    successCount: Math.max(candidateCount - failureCount, 0),
    failureCount
  };

  if (failureCount > 0) {
    throw new CloseExpiredError(`닫히지 않고 남은 장소가 ${failureCount}건 있다.`, result);
  }

  return result;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default {
  async scheduled(controller, env): Promise<void> {
    const cutoff = new Date(controller.scheduledTime).toISOString();

    try {
      const result = await closeExpired(env.DB, cutoff);
      console.log(
        JSON.stringify({
          event: 'close_expired_completed',
          cron: controller.cron,
          ...result
        })
      );
    } catch (error) {
      const result =
        error instanceof CloseExpiredError
          ? error.result
          : { cutoff, candidateCount: null, successCount: 0, failureCount: null };

      console.error(
        JSON.stringify({
          event: 'close_expired_failed',
          cron: controller.cron,
          ...result,
          error: errorMessage(error)
        })
      );
      throw error;
    }
  }
} satisfies ExportedHandler<Env>;
