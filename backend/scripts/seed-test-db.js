#!/usr/bin/env node

/**
 * Seed Test Database Script
 * 
 * Idempotent script to populate test database with:
 * - 8 test users from different universities
 * - 5 circles with various members and types
 * - Friend connections between users
 * - Watch requests with different scopes
 * - Activity logs and location data
 * 
 * Run: NODE_ENV=test node scripts/seed-test-db.js
 * Reset: NODE_ENV=test node scripts/seed-test-db.js --reset
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { generateFriendCode } from '../src/utils/auth.js';

dotenv.config();

// Initialize Supabase with TEST database credentials
const supabaseUrl = process.env.TEST_SUPABASE_URL;
const supabaseKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: TEST_SUPABASE_URL and TEST_SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_USERS = [
  {
    id: uuidv4(),
    name: "Alice Khan",
    email: "alice@nsu.edu",
    password: "TestPass123!",
    university: "North South University",
    facebook: "alice.khan",
    instagram: "alice_nsu",
  },
  {
    id: uuidv4(),
    name: "Bob Rahman",
    email: "bob@bracu.edu",
    password: "TestPass123!",
    university: "BRAC University",
    facebook: null,
    instagram: "bob_bracu",
  },
  {
    id: uuidv4(),
    name: "Chloe David",
    email: "chloe@iub.edu",
    password: "TestPass123!",
    university: "Independent University Bangladesh",
    facebook: "chloe.david",
    instagram: null,
  },
  {
    id: uuidv4(),
    name: "David Sheikh",
    email: "david@aiub.edu",
    password: "TestPass123!",
    university: "American Int. University-Bangladesh",
    facebook: "david.sheikh",
    instagram: "david_aiub",
  },
  {
    id: uuidv4(),
    name: "Emma Hassan",
    email: "emma@du.edu",
    password: "TestPass123!",
    university: "University of Dhaka",
    facebook: null,
    instagram: "emma_dhaka",
  },
  {
    id: uuidv4(),
    name: "Fahim Islam",
    email: "fahim@nsu.edu",
    password: "TestPass123!",
    university: "North South University",
    facebook: "fahim.islam",
    instagram: "fahim_nsu",
  },
  {
    id: uuidv4(),
    name: "Gianna Patel",
    email: "gianna@bracu.edu",
    password: "TestPass123!",
    university: "BRAC University",
    facebook: "gianna.patel",
    instagram: "gianna_bracu",
  },
  {
    id: uuidv4(),
    name: "Hassan Ahmed",
    email: "hassan@iub.edu",
    password: "TestPass123!",
    university: "Independent University Bangladesh",
    facebook: null,
    instagram: "hassan_iub",
  },
];

const TEST_CIRCLES = [
  {
    id: uuidv4(),
    name: "The Night Owls",
    description: "Engineering design sprint hub for final semester project",
    type: "university",
    admin_id: null, // Will be set to Alice
    is_open: false,
  },
  {
    id: uuidv4(),
    name: "Tech Collective",
    description: "Workspace and code collaboration for hackathon team",
    type: "custom",
    admin_id: null, // Will be set to Bob
    is_open: true,
  },
  {
    id: uuidv4(),
    name: "Study Group Alpha",
    description: "Quiet study sessions and exam preparation",
    type: "university",
    admin_id: null, // Will be set to Chloe
    is_open: false,
  },
  {
    id: uuidv4(),
    name: "BRACU Runners",
    description: "Jogging and fitness activities",
    type: "university",
    admin_id: null, // Will be set to Gianna
    is_open: true,
  },
  {
    id: uuidv4(),
    name: "Creative Minds",
    description: "Art, design, and creative projects",
    type: "custom",
    admin_id: null, // Will be set to Emma
    is_open: false,
  },
];

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function resetDatabase() {
  console.log('🔄 Resetting test database...');
  try {
    // Delete in reverse order of dependencies
    await supabase.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('locations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('watch_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('friend_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('circle_members').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('circle_boundaries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('circles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('✅ Database reset complete');
  } catch (err) {
    console.warn('⚠️  Reset warning:', err.message);
  }
}

async function seedUsers() {
  console.log('👤 Seeding users...');
  const hashedUsers = await Promise.all(
    TEST_USERS.map(async (user) => ({
      ...user,
      password_hash: await hashPassword(user.password),
      friend_code: generateFriendCode(),
    }))
  );

  const { data, error } = await supabase
    .from('users')
    .insert(
      hashedUsers.map(({ password, ...user }) => ({
        ...user,
        password_hash: user.password_hash,
        friend_code: user.friend_code,
      }))
    );

  if (error) throw new Error(`Failed to seed users: ${error.message}`);
  console.log(`✅ Created ${hashedUsers.length} test users`);
  return hashedUsers.map(({ password, ...user }) => user);
}

async function seedCircles(users) {
  console.log('🎯 Seeding circles...');
  const circlesWithAdmins = TEST_CIRCLES.map((circle, i) => ({
    ...circle,
    admin_id: users[i].id,
  }));

  const { error } = await supabase
    .from('circles')
    .insert(circlesWithAdmins);

  if (error) throw new Error(`Failed to seed circles: ${error.message}`);
  console.log(`✅ Created ${circlesWithAdmins.length} circles`);
  return circlesWithAdmins;
}

async function seedCircleMembers(users, circles) {
  console.log('👥 Seeding circle members...');
  
  const memberships = [];

  // Circle 0: The Night Owls (Alice is admin)
  // Add: Alice (admin), Bob, Fahim
  memberships.push(
    { circle_id: circles[0].id, user_id: users[0].id, role: 'admin' },
    { circle_id: circles[0].id, user_id: users[1].id, role: 'member' },
    { circle_id: circles[0].id, user_id: users[5].id, role: 'member' }
  );

  // Circle 1: Tech Collective (Bob is admin)
  // Add: Bob (admin), David, Hassan
  memberships.push(
    { circle_id: circles[1].id, user_id: users[1].id, role: 'admin' },
    { circle_id: circles[1].id, user_id: users[3].id, role: 'member' },
    { circle_id: circles[1].id, user_id: users[7].id, role: 'member' }
  );

  // Circle 2: Study Group Alpha (Chloe is admin)
  // Add: Chloe (admin), Emma, Alice
  memberships.push(
    { circle_id: circles[2].id, user_id: users[2].id, role: 'admin' },
    { circle_id: circles[2].id, user_id: users[4].id, role: 'member' },
    { circle_id: circles[2].id, user_id: users[0].id, role: 'member' }
  );

  // Circle 3: BRACU Runners (Gianna is admin)
  // Add: Gianna (admin), Bob, Fahim
  memberships.push(
    { circle_id: circles[3].id, user_id: users[6].id, role: 'admin' },
    { circle_id: circles[3].id, user_id: users[1].id, role: 'member' },
    { circle_id: circles[3].id, user_id: users[5].id, role: 'member' }
  );

  // Circle 4: Creative Minds (Emma is admin)
  // Add: Emma (admin), Alice, Chloe
  memberships.push(
    { circle_id: circles[4].id, user_id: users[4].id, role: 'admin' },
    { circle_id: circles[4].id, user_id: users[0].id, role: 'member' },
    { circle_id: circles[4].id, user_id: users[2].id, role: 'member' }
  );

  const { error } = await supabase
    .from('circle_members')
    .insert(memberships);

  if (error) throw new Error(`Failed to seed circle members: ${error.message}`);
  console.log(`✅ Added ${memberships.length} circle memberships`);
}

async function seedFriendConnections(users) {
  console.log('🤝 Seeding friend connections...');
  
  const friendships = [
    // Alice <-> Bob
    {
      from_user_id: users[0].id,
      to_user_id: users[1].id,
      status: 'accepted',
    },
    // Alice <-> Chloe
    {
      from_user_id: users[0].id,
      to_user_id: users[2].id,
      status: 'accepted',
    },
    // Bob <-> David
    {
      from_user_id: users[1].id,
      to_user_id: users[3].id,
      status: 'accepted',
    },
    // Chloe <-> Emma
    {
      from_user_id: users[2].id,
      to_user_id: users[4].id,
      status: 'accepted',
    },
    // Fahim -> Gianna (pending)
    {
      from_user_id: users[5].id,
      to_user_id: users[6].id,
      status: 'pending',
    },
  ];

  const { error } = await supabase
    .from('friend_requests')
    .insert(friendships);

  if (error) throw new Error(`Failed to seed friendships: ${error.message}`);
  console.log(`✅ Created ${friendships.length} friend connections`);
}

async function seedWatchRequests(users) {
  console.log('👁️ Seeding watch requests...');
  
  const watches = [
    // Alice watches Bob (campus only)
    {
      watcher_id: users[0].id,
      watched_user_id: users[1].id,
      scope: 'campus',
      status: 'accepted',
    },
    // Bob watches Alice (all zones)
    {
      watcher_id: users[1].id,
      watched_user_id: users[0].id,
      scope: 'all',
      status: 'accepted',
    },
    // Fahim watches Gianna (pending)
    {
      watcher_id: users[5].id,
      watched_user_id: users[6].id,
      scope: 'campus',
      status: 'pending',
    },
  ];

  const { error } = await supabase
    .from('watch_requests')
    .insert(watches);

  if (error) throw new Error(`Failed to seed watch requests: ${error.message}`);
  console.log(`✅ Created ${watches.length} watch requests`);
}

async function seedLocations(users) {
  console.log('📍 Seeding locations...');
  
  const locations = [];

  // Alice inside campus
  locations.push({
    user_id: users[0].id,
    latitude: 23.8103,
    longitude: 90.2817,
    accuracy: 10,
    is_inside: true,
    circle_id: null,
  });

  // Bob at tech workspace
  locations.push({
    user_id: users[1].id,
    latitude: 23.8150,
    longitude: 90.2870,
    accuracy: 15,
    is_inside: true,
    circle_id: null,
  });

  // Chloe at library
  locations.push({
    user_id: users[2].id,
    latitude: 23.8090,
    longitude: 90.2800,
    accuracy: 8,
    is_inside: true,
    circle_id: null,
  });

  // Emma outside campus
  locations.push({
    user_id: users[4].id,
    latitude: 23.8200,
    longitude: 90.2700,
    accuracy: 20,
    is_inside: false,
    circle_id: null,
  });

  const { error } = await supabase
    .from('locations')
    .insert(locations);

  if (error) throw new Error(`Failed to seed locations: ${error.message}`);
  console.log(`✅ Created ${locations.length} location records`);
}

async function seedActivityLogs(users, circles) {
  console.log('📋 Seeding activity logs...');
  
  const activities = [
    {
      user_id: users[0].id,
      circle_id: circles[0].id,
      action: 'member_joined',
      metadata: { user_name: 'Alice Khan' },
    },
    {
      user_id: users[1].id,
      circle_id: circles[0].id,
      action: 'member_joined',
      metadata: { user_name: 'Bob Rahman' },
    },
    {
      user_id: users[1].id,
      circle_id: circles[1].id,
      action: 'circle_created',
      metadata: { circle_name: 'Tech Collective' },
    },
    {
      user_id: users[2].id,
      circle_id: circles[2].id,
      action: 'circle_created',
      metadata: { circle_name: 'Study Group Alpha' },
    },
  ];

  const { error } = await supabase
    .from('activity_logs')
    .insert(activities);

  if (error) throw new Error(`Failed to seed activity logs: ${error.message}`);
  console.log(`✅ Created ${activities.length} activity log entries`);
}

async function main() {
  try {
    console.log('🌱 BondhuKoi Test Database Seed Script\n');

    // Check for --reset flag
    const shouldReset = process.argv.includes('--reset');
    if (shouldReset) {
      await resetDatabase();
      console.log('');
    }

    // Seed data
    const users = await seedUsers();
    const circles = await seedCircles(users);
    await seedCircleMembers(users, circles);
    await seedFriendConnections(users);
    await seedWatchRequests(users);
    await seedLocations(users);
    await seedActivityLogs(users, circles);

    console.log('\n✅ Seeding complete!\n');
    console.log('Test Users (password: TestPass123!):');
    users.forEach((u) => {
      console.log(`  🔑 ${u.email}`);
    });
    console.log('\nTest Database URL:', supabaseUrl);
    console.log('Run with --reset flag to clear and reseed: NODE_ENV=test node scripts/seed-test-db.js --reset\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

main();
