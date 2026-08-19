

async function testVoting() {
  console.log("Starting backend validation test...");
  
  // 1. We'll simulate Audience submitting 38 votes (which should be marked INVALID)
  const votes = [];
  for (let i = 1; i <= 38; i++) {
    votes.push({ teamId: i, totalScore: 80 });
  }

  const payload = {
    voterId: 'A_TEST_001',
    voterRole: 'AUDIENCE',
    voterTeamId: null,
    votes: votes
  };

  try {
    const res = await fetch('http://localhost:5000/api/evaluation/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    console.log("38 Votes Response:", data);
  } catch (err) {
    console.error(err);
  }
}

testVoting();
