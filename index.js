const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

  
    const logStream = fs.createWriteStream('out.log', { flags: 'a' });

    try {
        // Вхід у Facebook
        await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle2' });
        await page.type('#email', 'your-email');
        await page.type('#pass', 'your-password');
        await page.keyboard.press('Enter');

        // Чекаємо навігацію після входу
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        console.log('Успішний вхід в акаунт');
        logStream.write('Успішний вхід у Facebook\n');

        // Отримання user ID (з cookies)
        const cookies = await page.cookies();
        const c_user = cookies.find(cookie => cookie.name === 'c_user');

        if (c_user) {
            const userId = c_user.value;
            console.log('User ID:', userId);
            logStream.write(`User ID: ${userId}\n`);

            //  access token 
            const accessToken = 'ACCESS_TOKEN'; // ваш реальний access token

            //  URL для фотографії профілю
            const profilePicUrl = `https://graph.facebook.com/v21.0/${userId}/picture?type=large&access_token=${accessToken}`;
            console.log('Profile Picture URL:', profilePicUrl);
            logStream.write(`Profile Picture URL: ${profilePicUrl}\n`);

            // зображення через HTTP
            https.get(profilePicUrl, (response) => {
                // Перевірка статусу відповіді
                if (response.statusCode === 200) {
                    const contentType = response.headers['content-type'];
                    if (contentType && contentType.startsWith('image')) {
                        const imgPath = path.join(__dirname, 'profile_picture.jpg');
                        const fileStream = fs.createWriteStream(imgPath);
                        response.pipe(fileStream);
                        fileStream.on('finish', () => {
                            console.log('Зображення профілю збережено.');
                            logStream.write('Зображення профілю збережено.\n');
                        });
                    } else {
                        console.log('Відповідь не містить зображення.');
                        logStream.write('Відповідь не містить зображення.\n');
                    }
                } else if (response.statusCode === 302) {
                    // Обробка перенаправлення
                    const redirectUrl = response.headers['location'];
                    console.log('Перенаправлення на:', redirectUrl);
                    logStream.write(`Перенаправлення на: ${redirectUrl}\n`);

                    // Завантажуємо зображення за новим URL
                    https.get(redirectUrl, (redirectResponse) => {
                        if (redirectResponse.statusCode === 200) {
                            const contentType = redirectResponse.headers['content-type'];
                            if (contentType && contentType.startsWith('image')) {
                                const imgPath = path.join(__dirname, 'profile_picture.jpg');
                                const fileStream = fs.createWriteStream(imgPath);
                                redirectResponse.pipe(fileStream);
                                fileStream.on('finish', () => {
                                    console.log('Зображення профілю збережено після перенаправлення.');
                                    logStream.write('Зображення профілю збережено після перенаправлення.\n');
                                });
                            } else {
                                console.log('Відповідь після перенаправлення не містить зображення.');
                                logStream.write('Відповідь після перенаправлення не містить зображення.\n');
                            }
                        } else {
                            console.log(`Не вдалося отримати зображення після перенаправлення. Статус код: ${redirectResponse.statusCode}`);
                            logStream.write(`Не вдалося отримати зображення після перенаправлення. Статус код: ${redirectResponse.statusCode}\n`);
                        }
                    });
                } else {
                    console.log(`Не вдалося отримати зображення. Status Code: ${response.statusCode}`);
                    logStream.write(`Не вдалося отримати зображення. Status Code: ${response.statusCode}\n`);
                }
            });
        } else {
            console.log('Не вдалося отримати user ID.');
            logStream.write('Не вдалося отримати user ID.\n');
        }
    } catch (error) {
        console.error('Помилка:', error);
        logStream.write(`Помилка: ${error}\n`);
    } finally {
        await browser.close();
        logStream.end();
    }
})();
