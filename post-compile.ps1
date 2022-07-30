$output="$env:USERPROFILE\projs\obsidian-dev\test-vault"
$pdir="$output\.obsidian\plugins\obsidian-fountain-revived\"
Copy-Item main.js $pdir
Copy-Item .\manifest.json $pdir
Copy-Item .\src\styles.css $pdir