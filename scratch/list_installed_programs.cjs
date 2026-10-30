const { execSync } = require('child_process');
const fs = require('fs');

function getInstalledPrograms() {
    const psScript = `
    $paths = @(
        'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
        'HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
        'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'
    )

    $apps = Get-ItemProperty $paths -ErrorAction SilentlyContinue |
        Where-Object { 
            $_.DisplayName -and 
            $_.SystemComponent -ne 1 -and 
            $_.ParentKeyName -eq $null -and
            $_.DisplayName -notmatch '^KB[0-9]+'
        } |
        Select-Object DisplayName, DisplayVersion, Publisher, InstallDate, InstallLocation |
        Sort-Object DisplayName -Unique

    $apps | ConvertTo-Json -Depth 2
    `;

    try {
        const out = execSync(`powershell -NoProfile -Command "${psScript.replace(/\r?\n/g, ' ')}"`, { maxBuffer: 10 * 1024 * 1024 }).toString();
        return JSON.parse(out);
    } catch (e) {
        console.error('Error fetching registry apps:', e.message);
        return [];
    }
}

const programs = getInstalledPrograms();
console.log(`Total programs found: ${programs.length}`);

// Group them by category or inspect them
programs.forEach((p, idx) => {
    console.log(`${idx + 1}. ${p.DisplayName} | Version: ${p.DisplayVersion || 'N/A'} | Publisher: ${p.Publisher || 'N/A'}`);
});
