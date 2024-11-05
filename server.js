const express = require('express');
const axios = require('axios');
const MarkdownIt = require('markdown-it');
const path = require('path');

const app = express();
const md = new MarkdownIt();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Function to fetch README content for a specified repository
async function fetchReadme(username, repo) {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${username}/${repo}/readme`,
      { headers: { Accept: 'application/vnd.github.v3.raw' } }
    );
    return response.data;
  } catch (error) {
    return null;
  }
}

app.get('/api/readme', async (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  // Step 1: Try fetching README from username/username repository
  let readmeMarkdown = await fetchReadme(username, username);

  // Step 2: If README not found, fetch list of repositories and try the first one
  if (!readmeMarkdown) {
    try {
      const reposResponse = await axios.get(
        `https://api.github.com/users/${username}/repos?sort=updated`
      );

      const repos = reposResponse.data;
      if (repos.length > 0) {
        // Attempt to fetch README from the most recently updated repository
        readmeMarkdown = await fetchReadme(username, repos[0].name);
      }
    } catch (error) {
      return res.status(404).json({ error: 'No repositories found for this user' });
    }
  }

  // Step 3: If we have a README, convert and return it; otherwise, send an error
  if (readmeMarkdown) {
    const readmeHtml = md.render(readmeMarkdown);
    res.json({ content: readmeHtml });
  } else {
    res.status(404).json({ error: 'README.md not found for this user' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
