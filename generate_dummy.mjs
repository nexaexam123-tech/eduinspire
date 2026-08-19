import * as xlsx from 'xlsx';

const data = [
  { Email: 'part1@test.com', Password: 'PASS1' },
  { Email: 'part2@test.com', Password: 'PASS2' },
  { Email: 'part1@test.com', Password: 'PASS1' }, // duplicate to test skipping
];

const ws = xlsx.utils.json_to_sheet(data);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, 'Participants');

xlsx.writeFile(wb, 'dummy_participants.xlsx');
console.log('Dummy Excel created');
