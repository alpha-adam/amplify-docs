import fs from 'fs/promises'
import path from 'path'
import https from 'https'
import dotenv from 'dotenv'
dotenv.config()

async function sleep(ms) {
  await new Promise(resolve => setTimeout(resolve, ms))
}

async function callDeepinfra(messages) {
  const config = {
    hostname: 'api.deepinfra.com',
    path: '/v1/openai/chat/completions',
    apiKey: process.env.DEEPINFRA_API_KEY,
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo'
  }
  const options = {
    hostname: config.hostname,
    path: config.path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0',
      'Connection': 'close'
    }
  }
  const requestBody = {
    model: config.model,
    messages
  }
  const summary = await new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        let errorData = ''
        res.on('data', chunk => { errorData += chunk })
        res.on('end', () => { reject(new Error(`HTTP error! status: ${res.statusCode}, body: ${errorData}`)) })
        return
      }
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => { resolve(JSON.parse(data).choices[0].message.content) })
    })
    req.on('error', error => { reject(error) })
    req.write(JSON.stringify(requestBody))
    req.end()
  })
  return summary
}

async function processFile(oldFilePath, newFilePath) {
  const content = await fs.readFile(oldFilePath, 'utf8')
  const messages = JSON.parse(await fs.readFile('messages.json', 'utf8'))
  messages[1].content += content
  const summary = await callDeepinfra(messages)
  await fs.mkdir(path.dirname(newFilePath), { recursive: true })
  await fs.writeFile(newFilePath, summary)
}

async function traverseDir(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      await traverseDir(fullPath)
    } else if (entry.isFile()) {
      const relativePath = path.relative('oldDocs', fullPath)
      const newFilePath = path.join('newDocs', relativePath)
      try {
        await fs.access(newFilePath)
      } catch (e) {
        await processFile(fullPath, newFilePath)
        await sleep(1000)
      }
    }
  }
}

async function main() {
  await traverseDir('./oldDocs')
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})