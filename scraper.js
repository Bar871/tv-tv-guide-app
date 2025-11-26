const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeChannels() {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    const allPrograms = [];

    // --- Channel 11 (Kan) ---
    console.log('Scraping Channel 11...');
    try {
        await page.goto('https://www.kan.org.il/page-23538/?catid=138', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        await page.waitForTimeout(5000);

        const programs11 = await page.evaluate(() => {
            const items = [];
            const text = document.body.innerText;
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

            let lastTime = null;
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (/^\d{1,2}:\d{2}$/.test(line)) {
                    lastTime = line;
                } else if (lastTime && line.length > 3 && !line.includes('לוח') && !line.includes('שידורים') && !line.includes('תוכניות')) {
                    items.push({
                        channel: '11',
                        time: lastTime,
                        title: line
                    });
                    lastTime = null;
                }
            }
            return items;
        });

        console.log(`Channel 11: Found ${programs11.length} programs`);
        allPrograms.push(...normalizePrograms(programs11, '11'));
    } catch (e) {
        console.error('Error scraping Channel 11:', e.message);
    }

    // --- Channel 12 (Mako) ---
    console.log('Scraping Channel 12...');
    try {
        await page.goto('https://www.mako.co.il/tv-keshet12-live-schedule', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        await page.waitForTimeout(5000);

        const programs12 = await page.evaluate(() => {
            const items = [];

            // Try multiple selectors
            const containers = document.querySelectorAll('.item-content, .schedule-item, [class*="schedule"], [class*="program"]');

            if (containers.length > 0) {
                containers.forEach(container => {
                    const timeEl = container.querySelector('[class*="time"], .time, h3, h4');
                    const titleEl = container.querySelector('[class*="title"], .title, p, span');

                    if (timeEl && titleEl) {
                        const time = timeEl.innerText.trim();
                        const title = titleEl.innerText.trim();

                        if (/^\d{1,2}:\d{2}$/.test(time) && title.length > 1) {
                            items.push({
                                channel: '12',
                                time: time,
                                title: title
                            });
                        }
                    }
                });
            }

            // Fallback: parse text
            if (items.length === 0) {
                const text = document.body.innerText;
                const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                let lastTime = null;

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (/^\d{1,2}:\d{2}$/.test(line)) {
                        lastTime = line;
                    } else if (lastTime && line.length > 3 && !line.includes('|') && !line.includes('שידור')) {
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
        await page.goto('https://13tv.co.il/item/news/domestics/timetable-1419/', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        await page.waitForTimeout(5000);

        const programs13 = await page.evaluate(() => {
            const items = [];
            const text = document.body.innerText;
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
            return items;
        });

        console.log(`Channel 13: Found ${programs13.length} programs`);
        allPrograms.push(...normalizePrograms(programs13, '13'));
    } catch (e) {
        console.error('Error scraping Channel 13:', e.message);
    }

    // --- Channel 14 (Now 14) ---
    console.log('Scraping Channel 14...');
    try {
        await page.goto('https://www.now14.co.il/schedule/', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        await page.waitForTimeout(5000);

        const programs14 = await page.evaluate(() => {
            const items = [];

            // Try to find schedule items
            const scheduleItems = document.querySelectorAll('[class*="schedule"], [class*="program"], .item, article');

            if (scheduleItems.length > 0) {
                scheduleItems.forEach(item => {
                    const text = item.innerText;
                    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

                    for (let i = 0; i < lines.length; i++) {
                        if (/^\d{1,2}:\d{2}$/.test(lines[i]) && i + 1 < lines.length) {
                            items.push({
                                channel: '14',
                                time: lines[i],
                                title: lines[i + 1]
                            });
                            break;
                        }
                    }
                });
            }

            // Fallback: parse text
            if (items.length === 0) {
                const text = document.body.innerText;
                const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                let lastTime = null;

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (/^\d{1,2}:\d{2}$/.test(line)) {
                        lastTime = line;
                    } else if (lastTime && line.length > 3) {
                        items.push({
                            channel: '14',
                            time: lastTime,
                            title: line
                        });
                        lastTime = null;
                    }
                }
            }

            return items;
        });

        console.log(`Channel 14: Found ${programs14.length} programs`);
        allPrograms.push(...normalizePrograms(programs14, '14'));
    } catch (e) {
        console.error('Error scraping Channel 14:', e.message);
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
