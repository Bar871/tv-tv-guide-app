const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeChannels() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    const allPrograms = [];

    // --- Channel 14 (Now 14) ---
    console.log('Scraping Channel 14...');
    try {
        await page.goto('https://www.c14.co.il/shidurim', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        // Wait for schedule to load
        await page.waitForSelector('.flex.flex-col.gap-y-5', { timeout: 10000 });

        const programs14 = await page.evaluate(() => {
            const items = [];
            const containers = document.querySelectorAll('.flex.flex-col.gap-y-5 > div, .flex.flex-col.gap-y-5 > a');

            containers.forEach(container => {
                const timeEl = container.querySelector('h1');
                const titleEl = container.querySelector('p');

                if (timeEl && titleEl) {
                    const time = timeEl.innerText.trim();
                    const title = titleEl.innerText.trim();

                    // Only add if it's a valid time format
                    if (/^\d{1,2}:\d{2}$/.test(time)) {
                        items.push({
                            channel: '14',
                            time: time,
                            title: title
                        });
                    }
                }
            });
            return items;
        });

        console.log(`Channel 14: Found ${programs14.length} programs`);
        allPrograms.push(...normalizePrograms(programs14, '14'));
    } catch (e) {
        console.error('Error scraping Channel 14:', e.message);
    }

    // --- Channel 12 (Mako) ---
    console.log('Scraping Channel 12...');
    try {
        await page.goto('https://www.mako.co.il/tv-tv-schedule', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        // Wait a bit for content to load
        await page.waitForTimeout(3000);

        const programs12 = await page.evaluate(() => {
            const items = [];

            // Try to find the schedule container
            const scheduleContainer = document.querySelector('[class*="broadcastContent"]') ||
                document.querySelector('.broadcast-content') ||
                document.body;

            if (!scheduleContainer) return [];

            const text = scheduleContainer.innerText;
            const lines = text.split('\n');
            let lastTime = null;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                // Check if line is a time (HH:MM)
                if (/^\d{1,2}:\d{2}$/.test(line)) {
                    lastTime = line;
                } else if (lastTime && line.length > 1) {
                    // Skip common non-program text
                    const skipWords = ['|', 'שידור חי', 'לצפייה', 'היום', 'תוכניות', 'ערוץ'];
                    const shouldSkip = skipWords.some(word => line.includes(word));

                    if (!shouldSkip && line.length > 3) {
                        items.push({
                            channel: '12',
                            time: lastTime,
                            title: line
                        });
                        lastTime = null;
                    }
                }
            }
            return items;
        });

        console.log(`Channel 12: Found ${programs12.length} programs`);
        allPrograms.push(...normalizePrograms(programs12, '12'));
    } catch (e) {
        console.error('Error scraping Channel 12:', e.message);
    }

    // --- Channel 13 (Reshet) ---
    console.log('Scraping Channel 13...');
    try {
        await page.goto('https://13tv.co.il/tv-guide/', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        await page.waitForTimeout(3000);

        const programs13 = await page.evaluate(() => {
            const items = [];

            // Look for schedule items - they might be in links or divs
            const scheduleLinks = document.querySelectorAll('a[class*="Schedule"], a[href*="item"]');

            scheduleLinks.forEach(link => {
                const text = link.innerText.trim();
                const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

                // Look for time pattern in the text
                for (let i = 0; i < lines.length; i++) {
                    if (/^\d{1,2}:\d{2}$/.test(lines[i])) {
                        // Found time, next line should be title
                        if (i + 1 < lines.length) {
                            items.push({
                                channel: '13',
                                time: lines[i],
                                title: lines[i + 1]
                            });
                        }
                        break;
                    }
                }
            });

            // Fallback: try parsing text content
            if (items.length === 0) {
                const mainContent = document.querySelector('[class*="Schedule"]') || document.body;
                const text = mainContent.innerText;
                const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

                let lastTime = null;
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (/^\d{1,2}:\d{2}$/.test(line)) {
                        lastTime = line;
                    } else if (lastTime && line.length > 3 && !line.includes('לוח') && !line.includes('ערוץ')) {
                        items.push({
                            channel: '13',
                            time: lastTime,
                            title: line
                        });
                        lastTime = null;
                    }
                }
            }

            return items;
        });

        console.log(`Channel 13: Found ${programs13.length} programs`);
        allPrograms.push(...normalizePrograms(programs13, '13'));
    } catch (e) {
        console.error('Error scraping Channel 13:', e.message);
    }

    // --- Channel 11 (Kan) ---
    console.log('Scraping Channel 11...');
    try {
        await page.goto('https://www.kan.org.il/tv-guide/', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        await page.waitForTimeout(3000);

        const programs11 = await page.evaluate(() => {
            const items = [];

            // Look for program cards/items
            const cards = document.querySelectorAll('[class*="program"], [class*="tvguide"], [class*="schedule"]');

            cards.forEach(card => {
                const text = card.innerText;
                const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

                // Look for time in card
                for (let i = 0; i < lines.length; i++) {
                    if (/^\d{1,2}:\d{2}$/.test(lines[i])) {
                        // Found time, next line should be title
                        if (i + 1 < lines.length) {
                            items.push({
                                channel: '11',
                                time: lines[i],
                                title: lines[i + 1]
                            });
                        }
                        break;
                    }
                }
            });

            // Fallback: parse all text
            if (items.length === 0) {
                const text = document.body.innerText;
                const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

                let lastTime = null;
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (/^\d{1,2}:\d{2}$/.test(line)) {
                        lastTime = line;
                    } else if (lastTime && line.length > 3 && !line.includes('לוח') && !line.includes('שידורים')) {
                        items.push({
                            channel: '11',
                            time: lastTime,
                            title: line
                        });
                        lastTime = null;
                    }
                }
            }

            return items;
        });

        console.log(`Channel 11: Found ${programs11.length} programs`);
        allPrograms.push(...normalizePrograms(programs11, '11'));
    } catch (e) {
        console.error('Error scraping Channel 11:', e.message);
    }

    await browser.close();

    // Save to file
    fs.writeFileSync('schedule.json', JSON.stringify(allPrograms, null, 2));
    console.log(`\n✅ Saved ${allPrograms.length} total programs to schedule.json`);

    // Show breakdown by channel
    const breakdown = {};
    allPrograms.forEach(p => {
        breakdown[p.channel] = (breakdown[p.channel] || 0) + 1;
    });
    console.log('\nBreakdown by channel:');
    Object.keys(breakdown).sort().forEach(ch => {
        console.log(`  Channel ${ch}: ${breakdown[ch]} programs`);
    });
}

function normalizePrograms(rawItems, channel) {
    const normalized = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    rawItems.forEach((item, index) => {
        // Convert HH:MM to ISO Date
        const [hours, minutes] = item.time.split(':').map(num => parseInt(num));
        const start = new Date(today);
        start.setHours(hours, minutes, 0, 0);

        // Handle midnight crossover (programs after midnight are next day)
        if (hours < 6) {
            start.setDate(start.getDate() + 1);
        }

        // Default end time (1 hour later)
        const end = new Date(start.getTime() + 60 * 60 * 1000);

        normalized.push({
            channel: channel,
            title: item.title,
            startTime: start.toISOString(),
            endTime: end.toISOString()
        });
    });

    // Fix end times based on next program's start time
    normalized.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    for (let i = 0; i < normalized.length - 1; i++) {
        if (normalized[i].channel === normalized[i + 1].channel) {
            normalized[i].endTime = normalized[i + 1].startTime;
        }
    }

    return normalized;
}

// Run the scraper
scrapeChannels().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
