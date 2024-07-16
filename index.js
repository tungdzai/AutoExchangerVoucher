const axios = require("axios");
const tough = require("tough-cookie");
const {wrapper} = require("axios-cookiejar-support");
const fs = require("fs");
const keep_alive = require("./keep_alive.js");

async function delay(minSeconds, maxSeconds) {
    const randomDelay =
        Math.floor(Math.random() * (maxSeconds - minSeconds + 1) * 1000) +
        minSeconds * 1000;
    await new Promise((resolve) => setTimeout(resolve, randomDelay));
    return randomDelay / 1000;
}

async function authLogin(token, retries = 3) {
    if (retries < 0) {
        return null;
    } else if (retries < 2) {
        // Đợi 1s đến 3s
        await delay(1, 3);
    }
    try {
        const jar = new tough.CookieJar();
        const client = wrapper(axios.create({jar}));
        const urlLogin = `https://var.fconline.garena.vn/auth/login/callback?access_token=${token}`;
        await client.get(urlLogin, {
            headers: {
                "sec-ch-ua":
                    '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Windows"',
                "Upgrade-Insecure-Requests": "1",
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "Sec-Fetch-Site": "cross-site",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-User": "?1",
                "Sec-Fetch-Dest": "document",
                host: "var.fconline.garena.vn",
            },
        });
        const cookies = await jar.getCookies(urlLogin);
        const sessionCookie = cookies.find(
            (cookie) => cookie.key === "session",
        );
        const sessionSigCookie = cookies.find(
            (cookie) => cookie.key === "session.sig",
        );
        if (sessionCookie && sessionSigCookie) {
            const session = sessionCookie.value;
            const sessionSig = sessionSigCookie.value;
            const cookieString = `session=${session}; session.sig=${sessionSig}`;
            return cookieString;
        } else {
            console.log("Session cookies not found");
        }
    } catch (error) {
        console.error("Lỗi xác thực:", error);
        return await authLogin(token, retries - 1);
    }
}

async function getInfo(cookie, retries = 3) {
    if (retries < 0) {
        return null;
    } else if (retries < 3) {
        // Đợi 1s đến 3s
        await delay(1, 3);
    }
    try {
        const jar = new tough.CookieJar();
        const client = wrapper(axios.create({jar}));
        const urlGetPlayer = "https://var.fconline.garena.vn/api/player/get";
        const response = await client.get(urlGetPlayer, {
            headers: {
                "sec-ch-ua":
                    '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
                Accept: "application/json, text/plain, */*",
                "sec-ch-ua-mobile": "?0",
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
                "sec-ch-ua-platform": '"Windows"',
                "Sec-Fetch-Site": "same-origin",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Dest": "empty",
                host: "var.fconline.garena.vn",
                Cookie: cookie,
            },
        });
        return response.data;
    } catch (error) {
        console.error("Lỗi lấy thông tin người chơi", error);
        return await getInfo(cookie, retries - 1);
    }
}

async function exchangeVoucher(cookie, id, retries = 10) {
    if (retries < 0) {
        return null;
    } else if (retries < 10) {
        await delay(1, 3);
    }
    try {
        const jar = new tough.CookieJar();
        const client = wrapper(axios.create({jar}));
        const urlExchange =
            "https://var.fconline.garena.vn/api/shop-rewards/exchange";
        const data = {id: id};
        const response = await client.post(urlExchange, data, {
            headers: {
                Host: "var.fconline.garena.vn",
                Accept: "application/json, text/plain, */*",
                "sec-ch-ua":
                    '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
                "Content-Type": "application/json",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Windows"',
                Cookie: cookie,
            },
        });
        return response.data;
    } catch (error) {
        console.error(
            "Thực hiện lấy voucher không thành công!",
            error.response.status,
        );
        return exchangeVoucher(cookie, id, retries - 1);
    }
}

async function readTokensFromFile(filename) {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, "utf8", (err, data) => {
            if (err) {
                return reject(err);
            }
            const tokens = data
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line.length > 0);
            resolve(tokens);
        });
    });
}

async function prepareData() {
    console.time("prepareData");
    const listTokens = await readTokensFromFile("data.txt");
    const listTokensNew = Array(5).fill(listTokens).flat();
    const idHunter = 8;
    const id500 = 10;
    const id200 = 11;
    const id100 = 12;
    const id50 = 13;
    const tokenSegments = [
        {count: 50, id: id500},
        {count: 20, id: idHunter},
        {count: 100, id: id200},
        {count: 100, id: id100},
        {count: listTokensNew.length - 270, id: id50},
    ];
    const dataList = [];
    for (const segment of tokenSegments) {
        const segmentTokens = listTokensNew.splice(0, segment.count);
        const segmentData = await Promise.all(
            segmentTokens.map(async (token) => {
                const cookie = await authLogin(token);
                if (cookie) {
                    const dataUser = await getInfo(cookie);
                    const point = dataUser.player.point;
                    return {token, cookie, id: segment.id, point};
                }
                return null;
            }),
        );
        dataList.push(...segmentData.filter((data) => data !== null));
    }
    console.timeEnd("prepareData");
    return dataList;
}

async function checkAllGift() {
    try {
        const url = "https://var.fconline.garena.vn/api/shop-rewards";
        const response = await axios.get(url, {
            headers: {
                "sec-ch-ua":
                    '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
                Accept: "application/json, text/plain, */*",
                "sec-ch-ua-mobile": "?0",
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
                "sec-ch-ua-platform": '"Windows"',
                "Sec-Fetch-Site": "same-origin",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Dest": "empty",
                host: "var.fconline.garena.vn",
            },
        });

        const rewards = response.data.userShopRewards;
        const selectedRewards = rewards.filter(
            (reward) => reward.shopReward.id >= 8 && reward.shopReward.id <= 13,
        );

        const allUserExchanger8 = 50;
        const allUserExchanger9 = 100;
        const allUserExchanger10 = 30;
        const allUserExchanger11 = 120;
        const allUserExchanger12 = 280;
        const allUserExchanger13 = 200;
        const item8 = selectedRewards.find((item) => item.shopReward.id === 8);
        const item9 = selectedRewards.find((item) => item.shopReward.id === 9);
        const item10 = selectedRewards.find(
            (item) => item.shopReward.id === 10,
        );
        const item11 = selectedRewards.find(
            (item) => item.shopReward.id === 11,
        );
        const item12 = selectedRewards.find(
            (item) => item.shopReward.id === 12,
        );
        const item13 = selectedRewards.find(
            (item) => item.shopReward.id === 13,
        );
        if (
            allUserExchanger8 !== item8.allUserExchanged ||
            allUserExchanger9 !== item9.allUserExchanged ||
            allUserExchanger10 !== item10.allUserExchanged ||
            allUserExchanger11 !== item11.allUserExchanged ||
            allUserExchanger12 !== item12.allUserExchanged ||
            allUserExchanger13 !== item13.allUserExchanged ||
            item8.allUserExchangedPerWeek !== item8.shopReward.limitForAllUserPerWeek ||
            item9.allUserExchangedPerWeek !== item9.shopReward.limitForAllUserPerWeek ||
            item10.allUserExchangedPerWeek !== item10.shopReward.limitForAllUserPerWeek ||
            item11.allUserExchangedPerWeek !== item11.shopReward.limitForAllUserPerWeek ||
            item12.allUserExchangedPerWeek !== item12.shopReward.limitForAllUserPerWeek ||
            item13.allUserExchangedPerWeek !== item13.shopReward.limitForAllUserPerWeek
        ) {
            console.log("Bắt đầu trao đổi voucher...");
            return true;
        } else {
            const randomNum = Math.floor(Math.random() * 1000);
            console.log(`Chưa có sự thay đổi ${randomNum}`);
            return await checkAllGift();
        }
    } catch (error) {
        console.error("Lỗi check gift", error.response.status);
        return await checkAllGift();
    }
}
async function processGifts() {
    const validDataList = await prepareData();
    if (validDataList) {
        console.log(validDataList);
        console.log("Dữ liệu đã sẵn sàng", validDataList.length);
    }
    const status = await checkAllGift();
    console.log(status);
    if (status) {
        const exchangePromises = validDataList.map((data) => {
            return exchangeVoucher(data.cookie, data.id).then((result) => {
                console.log(
                    `Token: ${data.token}, Point: ${data.point}, ID: ${data.id}, Result:`,
                    result,
                );
            });
        });
        await Promise.all(exchangePromises);
    }
}

processGifts().catch((error) =>
    console.error("Lỗi trong lần chạy đầu tiên:", error),
);
