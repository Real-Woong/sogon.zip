import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from 'react-native';

type Screen = 'intro' | 'relationship' | 'room' | 'home' | 'createFile' | 'folder';
type SogonStatus = 'scheduled' | 'ready' | 'opened' | 'closed';

type SogonFile = {
  id: string;
  tag: string;
  content: string;
  sensitivity: string;
  openingTime: string;
  recommendationOn: boolean;
  status: SogonStatus;
};

const colors = {
  cream: '#FFF9EE',
  navy: '#252B48',
  gray: '#7A7D8C',
  border: '#E8DFD2',
  lavender: '#9E8CFF',
  lavenderLight: '#ECE7FF',
  yellow: '#F8D36B',
  pink: '#F6A9B8',
  mint: '#BCE6D4',
  white: '#FFFFFF'
};

const tags = ['음식', '알레르기', '카페', '데이트 취향', '취미', '선물', '비밀'];
const sensitivities = ['😄', '😀', '🙂', '🙁', '😣'];
const openingOptions = ['지금 알려도 좋아요', '100일 후', '200일 후', '1년 후', '내가 직접 열게요', '열고 싶지 않아요'];

export default function App() {
  const [screen, setScreen] = useState<Screen>('intro');
  const [nickname, setNickname] = useState('');
  const [roomCreated, setRoomCreated] = useState(false);
  const [files, setFiles] = useState<SogonFile[]>([]);
  const [activeTab, setActiveTab] = useState<SogonStatus>('scheduled');

  const upcomingCount = useMemo(
    () => files.filter(file => file.status === 'scheduled' || file.status === 'ready').length,
    [files]
  );

  const openedCount = useMemo(
    () => files.filter(file => file.status === 'opened').length,
    [files]
  );

  const saveFile = (file: Omit<SogonFile, 'id' | 'status'>) => {
    const status: SogonStatus =
      file.openingTime === '지금 알려도 좋아요' ? 'ready' :
      file.openingTime === '열고 싶지 않아요' ? 'closed' :
      'scheduled';

    setFiles(previous => [{ ...file, id: String(Date.now()), status }, ...previous]);
    setActiveTab(status);
    setScreen('folder');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.phone}>
        {screen === 'intro' && <IntroScreen onStart={() => setScreen('relationship')} />}
        {screen === 'relationship' && <RelationshipScreen onNext={() => setScreen('room')} />}
        {screen === 'room' && (
          <RoomScreen
            nickname={nickname}
            roomCreated={roomCreated}
            onNicknameChange={setNickname}
            onCreate={() => setRoomCreated(true)}
            onHome={() => setScreen('home')}
          />
        )}
        {screen === 'home' && (
          <HomeScreen
            nickname={nickname}
            upcomingCount={upcomingCount}
            openedCount={openedCount}
            onCreateFile={() => setScreen('createFile')}
            onFolder={() => setScreen('folder')}
          />
        )}
        {screen === 'createFile' && <CreateFileScreen onBack={() => setScreen('home')} onSave={saveFile} />}
        {screen === 'folder' && (
          <FolderScreen
            files={files}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onBack={() => setScreen('home')}
          />
        )}
        {screen !== 'intro' && screen !== 'relationship' && screen !== 'room' && (
          <BottomNav active={screen} onNavigate={setScreen} />
        )}
      </View>
    </SafeAreaView>
  );
}

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <View style={styles.centerScreen}>
      <View style={[styles.floatIcon, styles.floatLeft]}>
        <MaterialCommunityIcons name="zip-box-outline" size={42} color={colors.lavender} />
      </View>
      <View style={[styles.floatIcon, styles.floatRight]}>
        <Ionicons name="folder-open-outline" size={52} color={colors.yellow} />
      </View>

      <View style={styles.brandMark}>
        <Ionicons name="folder-open" size={52} color={colors.white} />
      </View>
      <Text style={styles.logo}>소곤.zip</Text>
      <Text style={styles.heroCopy}>조용히 저장한 취향이,{'\n'}우리의 시간이 되는 곳.</Text>
      <Text style={styles.subCopy}>취향은 추천으로 풀리고,{'\n'}마음은 정해둔 날에 열려요.</Text>
      <PrimaryButton label="시작하기" onPress={onStart} />
    </View>
  );
}

function RelationshipScreen({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>누구와 소곤.zip을 시작할까요?</Text>
      <Pressable style={styles.folderOption} onPress={onNext}>
        <Text style={styles.optionIcon}>💛</Text>
        <View style={styles.flex}>
          <Text style={styles.optionTitle}>연인과 시작하기</Text>
          <Text style={styles.optionBody}>데이트와 기념일을 더 편하게 기록해요.</Text>
        </View>
      </Pressable>
      <Pressable style={[styles.folderOption, { backgroundColor: colors.lavenderLight }]} onPress={onNext}>
        <Text style={styles.optionIcon}>🫶</Text>
        <View style={styles.flex}>
          <Text style={styles.optionTitle}>친구와 시작하기</Text>
          <Text style={styles.optionBody}>약속, 여행, 취향을 더 쉽게 맞춰요.</Text>
        </View>
      </Pressable>
    </View>
  );
}

function RoomScreen({
  nickname,
  roomCreated,
  onNicknameChange,
  onCreate,
  onHome
}: {
  nickname: string;
  roomCreated: boolean;
  onNicknameChange: (value: string) => void;
  onCreate: () => void;
  onHome: () => void;
}) {
  if (roomCreated) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>상대방을 초대해주세요</Text>
        <View style={styles.inviteBox}>
          <Text style={styles.muted}>초대 코드</Text>
          <Text style={styles.inviteCode}>A7K92</Text>
        </View>
        <PrimaryButton label="홈으로 가기" onPress={onHome} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>소곤방 만들기</Text>
      <Text style={styles.label}>닉네임을 입력해주세요</Text>
      <TextInput
        value={nickname}
        onChangeText={onNicknameChange}
        placeholder="예: 지우"
        placeholderTextColor={colors.gray}
        style={styles.input}
      />
      <PrimaryButton label="새 소곤방 만들기" onPress={onCreate} disabled={!nickname.trim()} />
      <SecondaryButton label="초대코드로 들어가기" onPress={onCreate} />
    </View>
  );
}

function HomeScreen({
  nickname,
  upcomingCount,
  openedCount,
  onCreateFile,
  onFolder
}: {
  nickname: string;
  upcomingCount: number;
  openedCount: number;
  onCreateFile: () => void;
  onFolder: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.scrollScreen}>
      <Text style={styles.dDay}>D+87</Text>
      <Text style={styles.title}>{nickname ? `${nickname}의 소곤.zip` : '우리의 소곤.zip'}</Text>

      <DashboardCard
        icon="sparkles-outline"
        title="오늘의 추천.zip"
        body="두 사람의 취향을 조심스럽게 풀어봤어요."
        color={colors.lavender}
      />
      <DashboardCard
        icon="calendar-outline"
        title="다가오는 소곤파일"
        body={upcomingCount > 0 ? `열릴 파일 ${upcomingCount}개가 있어요.` : '아직 예정된 파일이 없어요.'}
        onPress={onFolder}
      />
      <DashboardCard
        icon="archive-outline"
        title="최근 기록.zip"
        body={openedCount > 0 ? `열린 파일 ${openedCount}개가 기록됐어요.` : '아직 열린 파일 기록이 없어요.'}
      />
      <Pressable style={styles.createCard} onPress={onCreateFile}>
        <Text style={styles.createCardText}>📄 새 소곤파일 만들기  .zip</Text>
      </Pressable>
    </ScrollView>
  );
}

function CreateFileScreen({
  onBack,
  onSave
}: {
  onBack: () => void;
  onSave: (file: Omit<SogonFile, 'id' | 'status'>) => void;
}) {
  const [tag, setTag] = useState(tags[0]);
  const [content, setContent] = useState('');
  const [sensitivity, setSensitivity] = useState(sensitivities[2]);
  const [openingTime, setOpeningTime] = useState(openingOptions[4]);
  const [recommendationOn, setRecommendationOn] = useState(true);

  return (
    <ScrollView contentContainerStyle={styles.scrollScreen}>
      <Header title="새 소곤파일 만들기" onBack={onBack} />
      <Text style={styles.subCopySmall}>언젠가 알려주고 싶은 취향이나 마음을 조용히 저장해보세요.</Text>

      <Text style={styles.label}>파일 태그</Text>
      <View style={styles.chipWrap}>
        {tags.map(item => (
          <Chip key={item} label={item} selected={tag === item} onPress={() => setTag(item)} />
        ))}
      </View>

      <Text style={styles.label}>파일 내용</Text>
      <TextInput
        value={content}
        onChangeText={setContent}
        placeholder="예: 사실 나는 매운 음식을 잘 못 먹어."
        placeholderTextColor={colors.gray}
        multiline
        style={[styles.input, styles.textarea]}
      />

      <Text style={styles.label}>민감도</Text>
      <View style={styles.emojiRow}>
        {sensitivities.map(item => (
          <Pressable key={item} onPress={() => setSensitivity(item)}>
            <Text style={[styles.emoji, sensitivity !== item && styles.dimmed]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>열리는 시점</Text>
      <View style={styles.chipWrap}>
        {openingOptions.map(item => (
          <Chip key={item} label={item} selected={openingTime === item} onPress={() => setOpeningTime(item)} />
        ))}
      </View>

      <View style={styles.toggleCard}>
        <View style={styles.flex}>
          <Text style={styles.optionTitle}>추천에 반영하기</Text>
          <Text style={styles.optionBody}>상대에게 열리기 전에도 추천에는 조심스럽게 반영돼요.</Text>
        </View>
        <Switch value={recommendationOn} onValueChange={setRecommendationOn} />
      </View>

      <PrimaryButton
        label="소곤파일 저장하기"
        disabled={!content.trim()}
        onPress={() => onSave({ tag, content: content.trim(), sensitivity, openingTime, recommendationOn })}
      />
    </ScrollView>
  );
}

function FolderScreen({
  files,
  activeTab,
  onTabChange,
  onBack
}: {
  files: SogonFile[];
  activeTab: SogonStatus;
  onTabChange: (tab: SogonStatus) => void;
  onBack: () => void;
}) {
  const visibleFiles = files.filter(file => file.status === activeTab);
  const tabs: Array<{ label: string; value: SogonStatus }> = [
    { label: '열릴 예정', value: 'scheduled' },
    { label: '열 준비됨', value: 'ready' },
    { label: '열림', value: 'opened' },
    { label: '닫아둠', value: 'closed' }
  ];

  return (
    <ScrollView contentContainerStyle={styles.scrollScreen}>
      <Header title="내 소곤폴더" onBack={onBack} />
      <View style={styles.tabRow}>
        {tabs.map(tab => (
          <Chip
            key={tab.value}
            label={tab.label}
            selected={activeTab === tab.value}
            onPress={() => onTabChange(tab.value)}
          />
        ))}
      </View>
      {visibleFiles.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>🔒</Text>
          <Text style={styles.muted}>아직 파일이 없어요</Text>
        </View>
      ) : visibleFiles.map(file => (
        <View key={file.id} style={styles.fileCard}>
          <View style={styles.fileHeader}>
            <Text style={styles.fileTitle}>📄 {file.tag}.zip</Text>
            <Text style={styles.zipBadge}>.zip</Text>
          </View>
          <Text style={styles.fileContent}>{file.content}</Text>
          <Text style={styles.muted}>{file.openingTime} · 민감도 {file.sensitivity}</Text>
          <Text style={styles.muted}>추천 반영 {file.recommendationOn ? 'ON' : 'OFF'}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} hitSlop={12}>
        <Ionicons name="chevron-back" size={26} color={colors.navy} />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerSpacer} />
    </View>
  );
}

function DashboardCard({
  icon,
  title,
  body,
  color = colors.white,
  onPress
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  color?: string;
  onPress?: () => void;
}) {
  const isAccent = color !== colors.white;

  return (
    <Pressable style={[styles.dashboardCard, { backgroundColor: color }]} onPress={onPress}>
      <View style={styles.cardTitleRow}>
        <Ionicons name={icon} size={21} color={isAccent ? colors.white : colors.lavender} />
        <Text style={[styles.cardTitle, isAccent && styles.cardTitleAccent]}>{title}</Text>
      </View>
      <Text style={[styles.cardBody, isAccent && styles.cardBodyAccent]}>{body}</Text>
    </Pressable>
  );
}

function BottomNav({ active, onNavigate }: { active: Screen; onNavigate: (screen: Screen) => void }) {
  const items: Array<{ label: string; screen: Screen; icon: keyof typeof Ionicons.glyphMap }> = [
    { label: '홈', screen: 'home', icon: 'home-outline' },
    { label: '폴더', screen: 'folder', icon: 'folder-open-outline' },
    { label: '생성', screen: 'createFile', icon: 'add-circle-outline' }
  ];

  return (
    <View style={styles.bottomNav}>
      {items.map(item => {
        const selected = active === item.screen;
        return (
          <Pressable key={item.screen} style={styles.navItem} onPress={() => onNavigate(item.screen)}>
            <Ionicons name={item.icon} size={22} color={selected ? colors.lavender : colors.gray} />
            <Text style={[styles.navLabel, selected && styles.navLabelActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, selected && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, selected && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function PrimaryButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable style={[styles.primaryButton, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.secondaryButton} onPress={onPress}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.cream
  },
  phone: {
    flex: 1,
    backgroundColor: colors.cream
  },
  centerScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 18
  },
  screen: {
    flex: 1,
    padding: 24,
    gap: 16
  },
  scrollScreen: {
    padding: 24,
    paddingBottom: 112,
    gap: 16
  },
  floatIcon: {
    position: 'absolute',
    opacity: 0.28
  },
  floatLeft: {
    left: 34,
    top: 110
  },
  floatRight: {
    right: 34,
    top: 160
  },
  brandMark: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.lavender
  },
  logo: {
    color: colors.navy,
    fontSize: 36,
    fontWeight: '800'
  },
  heroCopy: {
    color: colors.navy,
    fontSize: 21,
    lineHeight: 31,
    textAlign: 'center',
    fontWeight: '700'
  },
  subCopy: {
    color: colors.gray,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 18
  },
  subCopySmall: {
    color: colors.gray,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center'
  },
  title: {
    color: colors.navy,
    fontSize: 23,
    fontWeight: '800',
    lineHeight: 31,
    textAlign: 'center',
    marginBottom: 8
  },
  dDay: {
    color: colors.gray,
    textAlign: 'center'
  },
  folderOption: {
    minHeight: 112,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  optionIcon: {
    fontSize: 32
  },
  optionTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4
  },
  optionBody: {
    color: colors.gray,
    fontSize: 13,
    lineHeight: 19
  },
  flex: {
    flex: 1
  },
  label: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8
  },
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    color: colors.navy,
    paddingHorizontal: 16,
    fontSize: 16
  },
  textarea: {
    minHeight: 132,
    paddingTop: 14,
    textAlignVertical: 'top'
  },
  inviteBox: {
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.lavender,
    backgroundColor: colors.white,
    padding: 28,
    alignItems: 'center',
    marginVertical: 32
  },
  inviteCode: {
    color: colors.lavender,
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 5,
    marginTop: 8
  },
  muted: {
    color: colors.gray,
    fontSize: 13,
    lineHeight: 19
  },
  dashboardCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 12
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  cardTitle: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: '800'
  },
  cardTitleAccent: {
    color: colors.white
  },
  cardBody: {
    color: colors.gray,
    fontSize: 14,
    lineHeight: 21
  },
  cardBodyAccent: {
    color: colors.white
  },
  createCard: {
    minHeight: 92,
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.yellow,
    backgroundColor: '#FFF1BC',
    alignItems: 'center',
    justifyContent: 'center'
  },
  createCardText: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '800'
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  chipActive: {
    backgroundColor: colors.lavender,
    borderColor: colors.lavender
  },
  chipText: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: '700'
  },
  chipTextActive: {
    color: colors.white
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12
  },
  emoji: {
    fontSize: 30
  },
  dimmed: {
    opacity: 0.35
  },
  toggleCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerTitle: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: '800'
  },
  headerSpacer: {
    width: 26
  },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  emptyBox: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  emptyIcon: {
    fontSize: 40
  },
  fileCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 18,
    gap: 8
  },
  fileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  fileTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '800'
  },
  fileContent: {
    color: colors.navy,
    fontSize: 15,
    lineHeight: 22
  },
  zipBadge: {
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: colors.yellow,
    color: colors.navy,
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: colors.lavender,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800'
  },
  secondaryButton: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18
  },
  secondaryButtonText: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: '800'
  },
  disabled: {
    opacity: 0.45
  },
  bottomNav: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
    height: 70,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center'
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
    minWidth: 62
  },
  navLabel: {
    color: colors.gray,
    fontSize: 12,
    fontWeight: '700'
  },
  navLabelActive: {
    color: colors.lavender
  }
});
