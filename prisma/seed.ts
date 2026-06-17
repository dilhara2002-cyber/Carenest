import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.chatMessage.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.aICareRecord.deleteMany();
  await prisma.vaccination.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.growthRecord.deleteMany();
  await prisma.child.deleteMany();
  await prisma.pregnancy.deleteMany();
  await prisma.mother.deleteMany();
  await prisma.midwife.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create Admin User
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@carenest.com',
      password: hashedPassword,
      name: 'System Administrator',
      role: 'ADMIN',
      phone: '+94771234567',
      address: 'Colombo, Sri Lanka',
      language: 'en',
    },
  });
  console.log('✅ Created admin user:', adminUser.email);

  // Create Midwife Users
  const midwife1 = await prisma.user.create({
    data: {
      email: 'midwife1@carenest.com',
      password: hashedPassword,
      name: 'Sarah Fernando',
      role: 'MIDWIFE',
      phone: '+94772345678',
      address: 'Gampaha, Sri Lanka',
      language: 'en',
      midwife: {
        create: {
          licenseNumber: 'MW-2024-001',
          specialization: 'Prenatal Care',
          experience: 10,
          workArea: 'Gampaha District',
        },
      },
    },
    include: { midwife: true },
  });
  console.log('✅ Created midwife:', midwife1.email);

  const midwife2 = await prisma.user.create({
    data: {
      email: 'midwife2@carenest.com',
      password: hashedPassword,
      name: 'Kumari Perera',
      role: 'MIDWIFE',
      phone: '+94773456789',
      address: 'Kandy, Sri Lanka',
      language: 'si',
      midwife: {
        create: {
          licenseNumber: 'MW-2024-002',
          specialization: 'Postnatal Care',
          experience: 8,
          workArea: 'Kandy District',
        },
      },
    },
    include: { midwife: true },
  });
  console.log('✅ Created midwife:', midwife2.email);

  // Create Mother Users
  const mother1 = await prisma.user.create({
    data: {
      email: 'mother1@example.com',
      password: hashedPassword,
      name: 'Nirmala Silva',
      role: 'MOTHER',
      phone: '+94774567890',
      address: 'Gampaha, Sri Lanka',
      language: 'si',
      mother: {
        create: {
          dateOfBirth: new Date('1995-03-15'),
          bloodGroup: 'O+',
          emergencyContact: '+94771112233',
          emergencyName: 'Sunil Silva (Husband)',
          medicalHistory: 'No known allergies',
          assignedMidwifeId: midwife1.midwife!.id,
        },
      },
    },
    include: { mother: true },
  });
  console.log('✅ Created mother:', mother1.email);

  const mother2 = await prisma.user.create({
    data: {
      email: 'mother2@example.com',
      password: hashedPassword,
      name: 'Dilini Jayawardena',
      role: 'MOTHER',
      phone: '+94775678901',
      address: 'Kandy, Sri Lanka',
      language: 'en',
      mother: {
        create: {
          dateOfBirth: new Date('1990-07-22'),
          bloodGroup: 'A+',
          emergencyContact: '+94772223344',
          emergencyName: 'Ranjith Jayawardena (Husband)',
          medicalHistory: 'History of mild gestational diabetes',
          assignedMidwifeId: midwife2.midwife!.id,
        },
      },
    },
    include: { mother: true },
  });
  console.log('✅ Created mother:', mother2.email);

  // Create Pregnancy for Mother 1 (currently pregnant)
  const pregnancy1 = await prisma.pregnancy.create({
    data: {
      motherId: mother1.mother!.id,
      lastMenstrualPeriod: new Date(Date.now() - 20 * 7 * 24 * 60 * 60 * 1000), // 20 weeks ago
      expectedDeliveryDate: new Date(Date.now() + 20 * 7 * 24 * 60 * 60 * 1000), // 20 weeks from now
      currentWeek: 20,
      status: 'ACTIVE',
      medicalNotes: 'Normal pregnancy progression',
    },
  });
  console.log('✅ Created pregnancy for mother1');

  // Create Visit for Mother 1
  await prisma.visit.create({
    data: {
      motherId: mother1.mother!.id,
      midwifeId: midwife1.midwife!.id,
      visitType: 'ANTENATAL',
      visitDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      status: 'SCHEDULED',
      notes: 'Regular antenatal checkup - Week 21',
    },
  });
  console.log('✅ Created visit for mother1');

  // Create Child for Mother 2 (already delivered)
  const child1 = await prisma.child.create({
    data: {
      motherId: mother2.mother!.id,
      name: 'Kavisha Jayawardena',
      birthDate: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000), // 6 months ago
      gender: 'FEMALE',
      birthWeight: 3.2,
      birthHeight: 50,
      healthNotes: 'Normal delivery, healthy baby',
    },
  });
  console.log('✅ Created child for mother2');

  // Create Growth Records for Child
  await prisma.growthRecord.createMany({
    data: [
      {
        childId: child1.id,
        recordDate: new Date(Date.now() - 5 * 30 * 24 * 60 * 60 * 1000),
        weight: 4.5,
        height: 55,
        headCircumference: 38,
        notes: '1 month checkup - healthy growth',
      },
      {
        childId: child1.id,
        recordDate: new Date(Date.now() - 3 * 30 * 24 * 60 * 60 * 1000),
        weight: 6.0,
        height: 60,
        headCircumference: 40,
        notes: '3 month checkup - on track',
      },
      {
        childId: child1.id,
        recordDate: new Date(),
        weight: 7.5,
        height: 65,
        headCircumference: 42,
        notes: '6 month checkup - excellent progress',
      },
    ],
  });
  console.log('✅ Created growth records for child');

  // Create Vaccinations for Child
  const vaccinations = [
    { vaccineName: 'BCG', scheduledDate: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000), status: 'COMPLETED' as const },
    { vaccineName: 'Hepatitis B - Birth Dose', scheduledDate: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000), status: 'COMPLETED' as const },
    { vaccineName: 'OPV 1', scheduledDate: new Date(Date.now() - 4 * 30 * 24 * 60 * 60 * 1000), status: 'COMPLETED' as const },
    { vaccineName: 'Pentavalent 1', scheduledDate: new Date(Date.now() - 4 * 30 * 24 * 60 * 60 * 1000), status: 'COMPLETED' as const },
    { vaccineName: 'OPV 2', scheduledDate: new Date(Date.now() - 2 * 30 * 24 * 60 * 60 * 1000), status: 'COMPLETED' as const },
    { vaccineName: 'Pentavalent 2', scheduledDate: new Date(Date.now() - 2 * 30 * 24 * 60 * 60 * 1000), status: 'COMPLETED' as const },
    { vaccineName: 'OPV 3', scheduledDate: new Date(Date.now() + 2 * 7 * 24 * 60 * 60 * 1000), status: 'PENDING' as const },
    { vaccineName: 'Pentavalent 3', scheduledDate: new Date(Date.now() + 2 * 7 * 24 * 60 * 60 * 1000), status: 'PENDING' as const },
  ];

  for (const vax of vaccinations) {
    await prisma.vaccination.create({
      data: {
        childId: child1.id,
        vaccineName: vax.vaccineName,
        scheduledDate: vax.scheduledDate,
        administeredDate: vax.status === 'COMPLETED' ? vax.scheduledDate : null,
        status: vax.status,
        notes: vax.status === 'COMPLETED' ? 'Administered successfully' : 'Scheduled',
      },
    });
  }
  console.log('✅ Created vaccinations for child');

  // Create Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: mother1.id,
        title: 'Upcoming Visit Reminder',
        message: 'You have an antenatal visit scheduled for next week.',
        type: 'VISIT',
        status: 'UNREAD',
      },
      {
        userId: mother2.id,
        title: 'Vaccination Due',
        message: 'Kavisha is due for OPV 3 and Pentavalent 3 vaccinations.',
        type: 'VACCINATION',
        status: 'UNREAD',
      },
      {
        userId: midwife1.id,
        title: 'New Mother Assigned',
        message: 'A new mother has been assigned to your care.',
        type: 'SYSTEM',
        status: 'READ',
      },
    ],
  });
  console.log('✅ Created notifications');

  // Create Chat Messages
  await prisma.chatMessage.createMany({
    data: [
      {
        senderId: mother1.id,
        receiverId: midwife1.id,
        message: 'Hello, I have a question about my diet during pregnancy.',
        isRead: true,
      },
      {
        senderId: midwife1.id,
        receiverId: mother1.id,
        message: 'Of course! What would you like to know?',
        isRead: true,
      },
      {
        senderId: mother1.id,
        receiverId: midwife1.id,
        message: 'Is it safe to eat fish during pregnancy?',
        isRead: false,
      },
    ],
  });
  console.log('✅ Created chat messages');

  // Create AI Care Records
  await prisma.aICareRecord.create({
    data: {
      motherId: mother1.mother!.id,
      careType: 'FOOD',
      pregnancyWeek: 20,
      query: 'What are healthy food options during the 5th month of pregnancy?',
      suggestions: JSON.stringify([
        'Iron-rich foods like spinach and lean red meat',
        'Calcium from dairy products or fortified alternatives',
        'Folic acid from leafy greens and legumes',
        'Omega-3 fatty acids from fish (low mercury varieties)',
        'Whole grains for sustained energy',
      ]),
    },
  });
  console.log('✅ Created AI care records');

  console.log('');
  console.log('🎉 Database seeding completed successfully!');
  console.log('');
  console.log('📋 Test Accounts:');
  console.log('─────────────────────────────────────────');
  console.log('Admin:    admin@carenest.com / password123');
  console.log('Midwife:  midwife1@carenest.com / password123');
  console.log('Midwife:  midwife2@carenest.com / password123');
  console.log('Mother:   mother1@example.com / password123');
  console.log('Mother:   mother2@example.com / password123');
  console.log('─────────────────────────────────────────');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
