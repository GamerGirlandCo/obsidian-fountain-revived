$output="C:\Users\Corinthe\projs\obsidian-dev\obsidian-kanban\test-vault"
$pdir="$output\.obsidian\plugins\obsidian-fountain-revived\"

esbuild --bundle src/main.ts --external:@codemirror/* --external:obsidian --outfile=$pdir\main.js --watch
Copy-Item .\src\styles.css $pdir