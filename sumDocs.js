import fs from 'fs/promises'
import path from 'path'

async function concatenateFiles(directory) {
    let allContent = ''
    const subDirContents = new Map()
    
    async function readDir(currentPath) {
        const entries = await fs.readdir(currentPath, { withFileTypes: true })
        const relPath = path.relative('./newDocs', currentPath)
        let dirContent = ''
        
        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name)
            
            if (entry.isDirectory()) {
                await readDir(fullPath)
            } else if (entry.isFile()) {
                const content = await fs.readFile(fullPath, 'utf8')
                allContent += content + '\n\n'
                dirContent += content + '\n\n'
            }
        }
        
        if (dirContent) {
            subDirContents.set(relPath || 'root', dirContent.trim())
        }
    }
    
    await readDir(directory)
    
    // Write main combined file
    await fs.writeFile('combined_docs.txt', allContent.trim())
    
    // Write individual directory files
    for (const [dirPath, content] of subDirContents) {
        const fileName = `combined_${dirPath.replace(/[\/\\]/g, '_')}.txt`
        await fs.writeFile(fileName, content)
    }
}

async function main() {
    try {
        await concatenateFiles('./newDocs')
        console.log('Successfully combined all documents')
    } catch (error) {
        console.error('Error combining documents:', error)
        process.exit(1)
    }
}

main()
