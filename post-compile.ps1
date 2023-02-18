$output="$env:USERPROFILE\projs\obsidian-dev\test-vault"
$pdir="$output\.obsidian\plugins\obsidian-fountain-revived\"
$output2="$env:USERPROFILE\Desktop\ART\_tablets-stuff\.obsidian\plugins\obsidian-fountain-revived\"
Copy-Item main.js $pdir
Copy-Item .\manifest.json $pdir
Copy-Item .\src\styles.css $pdir

Copy-Item main.js $output
Copy-Item .\manifest.json $output
Copy-Item .\src\styles.css $output