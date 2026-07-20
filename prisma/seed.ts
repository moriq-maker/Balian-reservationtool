import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const CATEGORIES = [
  { name: 'カラオケ', displayOrder: 1 },
  { name: '岩盤浴', displayOrder: 2 },
  { name: 'その他', displayOrder: 3 },
] as const;

const FACILITIES = [
  {
    name: 'カラオケ101',
    category: 'カラオケ',
    durationMinutes: 90,
    displayOrder: 1,
    color: '#3B82F6',
    hasCleaning: false,
  },
  {
    name: 'カラオケ102',
    category: 'カラオケ',
    durationMinutes: 90,
    displayOrder: 2,
    color: '#2563EB',
    hasCleaning: false,
  },
  {
    name: '岩盤浴 LAUT',
    category: '岩盤浴',
    durationMinutes: 60,
    displayOrder: 1,
    color: '#F59E0B',
    hasCleaning: true,
  },
  {
    name: '岩盤浴 GUNUNG',
    category: '岩盤浴',
    durationMinutes: 60,
    displayOrder: 2,
    color: '#D97706',
    hasCleaning: true,
  },
  {
    name: 'PJ',
    category: 'その他',
    durationMinutes: 120,
    displayOrder: 1,
    color: '#10B981',
    hasCleaning: false,
  },
  {
    name: 'ランドリー',
    category: 'その他',
    durationMinutes: 300,
    displayOrder: 2,
    color: '#6B7280',
    hasCleaning: false,
  },
] as const;

function buildRoomNumbers(): string[] {
  const floors: Record<number, number> = {
    3: 8,
    4: 10,
    5: 10,
    6: 10,
    7: 10,
    8: 4,
    9: 3,
  };
  const rooms: string[] = [];
  for (const [floor, count] of Object.entries(floors)) {
    for (let i = 1; i <= count; i++) {
      rooms.push(`${floor}${String(i).padStart(2, '0')}`);
    }
  }
  return rooms;
}

async function main() {
  console.log('シード投入を開始します...');

  const categoryMap = new Map<string, string>();
  for (const category of CATEGORIES) {
    const record = await prisma.facilityCategory.upsert({
      where: { name: category.name },
      update: { displayOrder: category.displayOrder },
      create: category,
    });
    categoryMap.set(category.name, record.id);
  }
  console.log(`施設カテゴリ: ${categoryMap.size}件`);

  for (const facility of FACILITIES) {
    const categoryId = categoryMap.get(facility.category);
    if (!categoryId) {
      throw new Error(`カテゴリが見つかりません: ${facility.category}`);
    }
    await prisma.facility.upsert({
      where: { name: facility.name },
      update: {
        categoryId,
        durationMinutes: facility.durationMinutes,
        displayOrder: facility.displayOrder,
        color: facility.color,
        hasCleaning: facility.hasCleaning,
      },
      create: {
        name: facility.name,
        categoryId,
        durationMinutes: facility.durationMinutes,
        displayOrder: facility.displayOrder,
        color: facility.color,
        hasCleaning: facility.hasCleaning,
      },
    });
  }
  console.log(`施設: ${FACILITIES.length}件`);

  const roomNumbers = buildRoomNumbers();
  for (const [index, roomNumber] of roomNumbers.entries()) {
    await prisma.room.upsert({
      where: { roomNumber },
      update: { displayOrder: index + 1 },
      create: { roomNumber, displayOrder: index + 1 },
    });
  }
  console.log(`部屋番号: ${roomNumbers.length}件`);

  const settings: { key: string; value: unknown }[] = [
    { key: 'reservation_window_days', value: 3 },
    { key: 'time_slot_minutes', value: 15 },
    { key: 'timezone', value: 'Asia/Tokyo' },
  ];
  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value as never },
      create: { key: setting.key, value: setting.value as never },
    });
  }
  console.log(`システム設定: ${settings.length}件`);

  const seedAdminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'change-me-please';
  const passwordHash = await bcrypt.hash(seedAdminPassword, 10);
  await prisma.adminUser.upsert({
    where: { email: seedAdminEmail },
    update: {},
    create: {
      email: seedAdminEmail,
      passwordHash,
      displayName: '管理者',
    },
  });
  console.log(
    `管理者アカウント: ${seedAdminEmail}(初期パスワードは環境変数 SEED_ADMIN_PASSWORD で指定。未指定時は "change-me-please" のため本番投入前に必ず変更してください)`,
  );

  const seedStaffAccessCode = process.env.SEED_STAFF_ACCESS_CODE ?? '123456';
  const staffAccessCodeHash = await bcrypt.hash(seedStaffAccessCode, 10);
  // 既に設定済みの場合は上書きしない(再シード実行で管理者が変更したコードが
  // リセットされるのを防ぐため。update: {} で新規作成時のみ値を入れる)。
  await prisma.systemSetting.upsert({
    where: { key: 'staff_access_code' },
    update: {},
    create: {
      key: 'staff_access_code',
      value: { hash: staffAccessCodeHash, version: 1 } as never,
    },
  });
  console.log(
    `一般スタッフ用共通アクセスコード: ${seedStaffAccessCode}(環境変数 SEED_STAFF_ACCESS_CODE で指定可能。未指定時は "123456" のため本番投入前に必ず変更してください)`,
  );

  console.log('シード投入が完了しました。');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
