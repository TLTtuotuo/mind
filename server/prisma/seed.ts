import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. 系统配置
  const configs = [
    { key: 'max_bookings_per_week', value: '2', description: '每个学生每周最大预约次数' },
    { key: 'cancel_deadline_hours', value: '2', description: '预约开始前多少小时内不可取消' },
  ];
  for (const cfg of configs) {
    await prisma.systemConfig.upsert({
      where: { key: cfg.key },
      update: cfg,
      create: cfg,
    });
  }

  // 2. 创建管理员
  const adminHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminHash,
      name: '系统管理员',
      role: 'ADMIN',
    },
  });

  // 3. 创建心理老师
  const teacherHash = await bcrypt.hash('teacher123', 10);
  await prisma.user.upsert({
    where: { username: 'teacher' },
    update: {},
    create: {
      username: 'teacher',
      passwordHash: teacherHash,
      name: '李心语',
      role: 'TEACHER',
      phone: '13800001111',
    },
  });

  // 4. 创建班级
  const class1 = await prisma.class.upsert({
    where: { name: '三年级1班' },
    update: {},
    create: { name: '三年级1班', grade: 3 },
  });
  const class2 = await prisma.class.upsert({
    where: { name: '三年级2班' },
    update: {},
    create: { name: '三年级2班', grade: 3 },
  });

  // 5. 创建班主任
  const advisorHash = await bcrypt.hash('advisor123', 10);
  await prisma.user.upsert({
    where: { username: 'advisor1' },
    update: {},
    create: {
      username: 'advisor1',
      passwordHash: advisorHash,
      name: '张老师',
      role: 'ADVISOR',
      advisorClassId: class1.id,
    },
  });

  // 6. 创建学生
  const studentData = [
    { name: '王小明', no: '2024001', classId: class1.id },
    { name: '李小丽', no: '2024002', classId: class1.id },
    { name: '张大伟', no: '2024003', classId: class2.id },
  ];

  for (const s of studentData) {
    const user = await prisma.user.upsert({
      where: { username: `student_${s.no}` },
      update: {},
      create: {
        username: `student_${s.no}`,
        passwordHash: '',
        name: s.name,
        role: 'STUDENT',
      },
    });

    await prisma.student.upsert({
      where: { studentNo: s.no },
      update: {},
      create: {
        id: user.id,
        classId: s.classId,
        studentNo: s.no,
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { studentId: user.id },
    });
  }

  // 7. 创建家长
  const parentHash = await bcrypt.hash('parent123', 10);
  await prisma.user.upsert({
    where: { username: 'parent1' },
    update: {},
    create: {
      username: 'parent1',
      passwordHash: parentHash,
      name: '王爸爸',
      role: 'PARENT',
      phone: '13800002222',
    },
  });

  console.log('✅ Seed completed!');
  console.log('   Admin: admin / admin123');
  console.log('   Teacher: teacher / teacher123');
  console.log('   Advisor: advisor1 / advisor123');
  console.log('   Parent: parent1 / parent123');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
