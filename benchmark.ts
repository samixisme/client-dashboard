async function mockFetch(url: string, ms: number, result: any) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        json: async () => result,
        ok: true
      });
    }, ms);
  });
}

async function sequential() {
  const start = Date.now();
  const tokenData = { access_token: "short_lived" };

  // Exchange for long-lived token
  const longLivedRes: any = await mockFetch('token_url', 500, { access_token: "long_lived", expires_in: 3600 });
  const longLivedTokenData = await longLivedRes.json();

  // Get user profile
  const profileRes: any = await mockFetch(`profile_url?token=${longLivedTokenData.access_token}`, 500, { id: "123", name: "User" });
  const profileData = await profileRes.json();

  return Date.now() - start;
}

async function parallel() {
  const start = Date.now();
  const tokenData = { access_token: "short_lived" };

  // Use short lived token for both getting long lived token and getting profile
  const [longLivedRes, profileRes]: any = await Promise.all([
    mockFetch('token_url', 500, { access_token: "long_lived", expires_in: 3600 }),
    mockFetch(`profile_url?token=${tokenData.access_token}`, 500, { id: "123", name: "User" })
  ]);

  const [longLivedTokenData, profileData] = await Promise.all([
    longLivedRes.json(),
    profileRes.json()
  ]);

  return Date.now() - start;
}

async function run() {
  console.log("Running sequential...");
  const seqTime = await sequential();
  console.log(`Sequential: ${seqTime}ms`);

  console.log("Running parallel...");
  const parTime = await parallel();
  console.log(`Parallel: ${parTime}ms`);
}

run();
