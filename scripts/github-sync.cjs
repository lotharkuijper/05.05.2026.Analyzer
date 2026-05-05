const { ReplitConnectors } = require("@replit/connectors-sdk");
const { execSync } = require("child_process");
const { readFileSync, existsSync } = require("fs");

const connectors = new ReplitConnectors();

function parseRemote() {
  const override = process.env.GITHUB_REPO;
  if (override) {
    const parts = override.split("/");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error(
        `GITHUB_REPO env var must be in 'owner/repo' format, got: ${override}`,
      );
    }
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, "") };
  }
  const url = execSync("git config remote.origin.url").toString().trim();
  const match = url.match(/github\.com[/:]([^/]+)\/(.+?)(?:\.git)?$/);
  if (!match) throw new Error(`Cannot parse GitHub owner/repo from: ${url}`);
  return { owner: match[1], repo: match[2] };
}

function getTargetBranch() {
  try {
    const current = execSync("git branch --show-current", { encoding: "utf8" }).trim();
    if (current) {
      try {
        const merge = execSync(`git config branch.${current}.merge`, { encoding: "utf8" }).trim();
        if (merge) return merge.replace("refs/heads/", "");
      } catch {}
      return current;
    }
  } catch {}
  try {
    const ref = execSync("git symbolic-ref HEAD", { encoding: "utf8" }).trim();
    if (ref) return ref.replace("refs/heads/", "");
  } catch {}
  return "main";
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiWithRetry(path, options, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const resp = await connectors.proxy("github", path, options);
    if (resp.status === 429) {
      const wait = Math.pow(2, attempt + 1) * 1000;
      console.log(`  Rate limited, waiting ${wait / 1000}s...`);
      await sleep(wait);
      continue;
    }
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`GitHub API ${resp.status}: ${text}`);
    }
    return resp.json();
  }
  throw new Error("GitHub API: rate limit retries exhausted");
}

async function sync() {
  const { owner, repo } = parseRemote();
  const branch = getTargetBranch();
  const base = `/repos/${owner}/${repo}`;

  const raw = execSync("git ls-files -s").toString().trim();
  if (!raw) {
    console.log("No tracked files, nothing to sync.");
    return;
  }

  const entries = raw.split("\n").map((line) => {
    const parts = line.match(/^(\d+)\s+\S+\s+\S+\t(.+)$/);
    return { mode: parts[1], path: parts[2] };
  });

  console.log(`Syncing ${entries.length} files to GitHub (${owner}/${repo}, branch: ${branch})...`);

  const BATCH = 5;
  const DELAY_MS = 1100;
  const treeItems = [];

  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async (entry) => {
        if (!existsSync(entry.path)) return null;
        const content = readFileSync(entry.path);
        const blob = await apiWithRetry(`${base}/git/blobs`, {
          method: "POST",
          body: {
            content: content.toString("base64"),
            encoding: "base64",
          },
        });
        return {
          path: entry.path,
          mode: entry.mode,
          type: "blob",
          sha: blob.sha,
        };
      }),
    );
    treeItems.push(...results.filter(Boolean));
    const done = Math.min(i + BATCH, entries.length);
    process.stdout.write(`  Uploaded ${done}/${entries.length} files\r`);
    if (i + BATCH < entries.length) await sleep(DELAY_MS);
  }
  console.log("");

  await sleep(DELAY_MS);
  const tree = await apiWithRetry(`${base}/git/trees`, {
    method: "POST",
    body: { tree: treeItems },
  });

  const commitMsg = execSync("git log -1 --format=%B").toString().trim();
  const authorName = execSync("git log -1 --format=%an").toString().trim();
  const authorEmail = execSync("git log -1 --format=%ae").toString().trim();

  let parents = [];
  try {
    await sleep(DELAY_MS);
    const ref = await apiWithRetry(`${base}/git/refs/heads/${branch}`);
    parents = [ref.object.sha];
  } catch {
    // first push
  }

  await sleep(DELAY_MS);
  const commit = await apiWithRetry(`${base}/git/commits`, {
    method: "POST",
    body: {
      message: commitMsg,
      tree: tree.sha,
      parents,
      author: {
        name: authorName,
        email: authorEmail,
        date: new Date().toISOString(),
      },
    },
  });

  await sleep(DELAY_MS);
  try {
    await apiWithRetry(`${base}/git/refs/heads/${branch}`, {
      method: "PATCH",
      body: { sha: commit.sha, force: true },
    });
  } catch {
    await apiWithRetry(`${base}/git/refs`, {
      method: "POST",
      body: { ref: `refs/heads/${branch}`, sha: commit.sha },
    });
  }

  console.log(
    `GitHub sync complete (commit: ${commit.sha.substring(0, 7)}).`,
  );
}

sync().catch((err) => {
  console.error("GitHub sync failed:", err.message);
  process.exit(1);
});
