import { load } from 'cheerio'
import fetch from 'node-fetch'
import express from 'express';
import cors from 'cors';
import getUrls from 'get-urls';

// import puppeteer from 'puppeteer-core';
// import chromium from 'chrome-aws-lambda';

import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors()); // Enable CORS for all routes
app.use(express.json());


// const hf = new HfInference(process.env.HUGGING_FACE_TOKEN)

async function queryAI(data) {
    try {
        const response = await fetch(
            "https://api-inference.huggingface.co/models/google/flan-t5-base",
            {
                headers: { Authorization: `Bearer ${process.env.HUGGING_FACE_TOKEN}` },
                method: "POST",
                body: JSON.stringify(data),
            }
        );
        const result = await response.json();
        return result;
    } catch (error) {
        console.error(error);
    }

}

app.post('/getinfo', cors(), async (request, response) => {
    try {
        const body = request.body;
        const info = []
        for (const website of body.website) {
            const data = await ScrapeEbay(website);
            info.push(...data[0])
            // }
        }
        const forAI = info.map((item) => {
            return {
                title: item.title,
                price: item.price,
                shipping: item.shipping,
            }
        })
        const best = []
        for (const condition of body.condition) {
            // const answ = await model.findAnswers("Calculate approximate price of a " + condition + body.item + "in less than 10 characters?", JSON.stringify(forAI))
            // const res = await generate("Calculate approximate price of a " + condition + body.item + "?", JSON.stringify(forAI));
            // const fan = await hf.conversational({
            //     model: 'meta-llama/Llama-2-7b',
            //     inputs: `context: ${JSON.stringify(forAI)}
            //     question: Calculate approximate price of a ${condition} ${body.item}?`
            // })
            const seed = await queryAI({ inputs: " Context: \n " + JSON.stringify(forAI)  + " Calculate approximate price of a " + condition + " " + body.item + "?", })
            console.log(seed[0].generated_text)
            // const seed = await see("Hello, I'm a language model", max_length = 30, num_return_sequences = 3)

            best.push({
                price: seed[0].generated_text,
                condition: condition
            })
        }
        response.send({
            "price": best,
            "data": info,
            "image": info[0].image
        })

    } catch (error) {
        console.log(error)
        response.send(error)
    }
});

// const ScrapeImage = async (product) => {
//     const browser = await puppeteer.launch({
//         args: chromium.args,
//         executablePath: process.env.CHROME_EXECUTABLE_PATH || await chromium.executablePath,
//         headless: true,
//         // `headless: true` (default) enables old Headless;
//         // `headless: 'new'` enables new Headless;
//         // `headless: false` enables “headful” mode.
//     });
//     const page = await browser.newPage();
//     await page.goto(`https://www.google.com/search?sxsrf=AB5stBitTXFlPVor6er7GcahFPhl636aIg:1689350330462&q=${product.replace(" ", "+")}&tbm=isch&sa=X&ved=2ahUKEwiktOSyyI6AAxX3lokEHWu4C20Q0pQJegQIDRAB&biw=1508&bih=778&dpr=2`)
//     await page.waitForSelector("#islrg > div.islrc > div:nth-child(2) > a.wXeWr.islib.nfEiy > div.bRMDJf.islir > img")
//     // const image = await page.$$("div.bRMDJf.islir > img")
//     const image = await page.$eval('#islrg > div.islrc > div:nth-child(2) > a.wXeWr.islib.nfEiy > div.bRMDJf.islir > img', span => span.src)
//     // const res = await fetch(`https://www.google.com/search?sxsrf=AB5stBitTXFlPVor6er7GcahFPhl636aIg:1689350330462&q=${product.replace(" ", "+")}&tbm=isch&sa=X&ved=2ahUKEwiktOSyyI6AAxX3lokEHWu4C20Q0pQJegQIDRAB&biw=1508&bih=778&dpr=2`);
//     // const html = await res.text();
//     // // console.log(html)
//     // const $ = load(html);
//     // const data = []
//     // const image = $("#islrg > div.islrc > div:nth-child(2) > a.wXeWr.islib.nfEiy > div.bRMDJf.islir > img").length

//     // for (const im of image) {
//     //     try {
//     //         console.log(await im.getAttribute("src"))
//     //     } catch (error) {
//     //         continue
//     //     }
//     // }
//     browser.close();
//     return image
// }


const ScrapeEbay = (web) => {

    const urls = Array.from(getUrls(web));

    const requests = urls.map(async url => {
        try {
            const res = await fetch(url);
            const html = await res.text();
            // console.log(html)
            const $ = load(html);
            const data = []
            $("#srp-river-results > ul").each((i, el) => {
                $(el).find("li.s-item").each((i, el) => {
                    data.push({
                        title: $(el).find(".s-item__link > .s-item__title > span").text(),
                        price: $(el).find("span.s-item__price").text(),
                        image: $(el).find("div > .s-item__image-section > div > a > div > img").attr("src"),
                        date: $(el).find("div > div.s-item__info.clearfix > div.s-item__caption-section > div > span.POSITIVE").text(),
                        shipping: $(el).find("div > div.s-item__info.clearfix > div.s-item__details.clearfix > div:nth-child(4) > span").text(),
                    })
                })
            })

            const getMetatag = (name) =>
                $(`meta[name=${name}]`).attr('content') ||
                $(`meta[name="og:${name}"]`).attr('content') ||
                $(`meta[name="twitter:${name}"]`).attr('content');
            return data
        } catch (err) {

            console.log(err)
        }
    });
    return Promise.all(requests);
}

// const ScapePuppeteerBestbuy = async (web) => {
//     const browser = await puppeteer.launch({
//         args: chromium.args,
//         executablePath: process.env.CHROME_EXECUTABLE_PATH || await chromium.executablePath,
//         headless: true,
//     });
//     const page = await browser.newPage();
//     await page.goto(web)
//     await page.waitForSelector('.productItemImage_1en8J')
//     const products = await page.$$(".x-productListItem ")
//     const image = await page.$$(" .productItemImage_1en8J ")


//     const data = []
//     // console.log(image.length)
//     // console.log(products.length)
//     // console.log()
//     // for (const im of image) {
//     //     try {
//     //         console.log(await im.getAttribute("srcset"))
//     //     } catch (error) {
//     //         continue
//     //     }
//     // }
//     for (const product of products) {
//         try {
//             const image = await product.evaluate((el) => {
//                 const imageElement = el.querySelector('.productItemImage_1en8J').getAttribute("src");
//                 return imageElement ? imageElement : null;
//             }, product)
//             // console.log(await product.$eval(".productItemImageContainer_3qUiK > div > div > div > img", img => img.alt))
//             // console.log(image)
//             const title = await product.evaluate((el) => el.querySelector('.productItemName_3IZ3c').textContent, product)
//             // console.log(title)
//             const price = await product.evaluate((el) => el.querySelector('.productPricingContainer_3gTS3 > span:nth-child(1) > span').textContent, product)
//             // console.log(price)
//             const all = {
//                 title,
//                 price,
//                 image
//             }
//             data.push(all)
//         } catch (error) {
//             continue
//         }
//     }
//     //     // const tit = await product.evaluate('span.s-item__title', span => span.innerText)
//     //     // const title = await product.$eval('h3.s-item__title', h3 => h3.innerText)
//     //     // const title = await product.evaluate((el) => el.querySelector(".s-item__link > .s-item__title > span").textContent, product)
//     //     // const price = await product.$eval('span.s-item__price', span => span.innerText)
//     //     // const image = await product.evaluate((el) => el.querySelector("div > .s-item__image-section > div > a > div > img").getAttribute("src"), product)
//     //     // const all = {
//     //     //     title,
//     //     //     price,
//     //     //     image
//     //     // }
//     //     // console.log("something")
//     //     // data.push(all)
//     // }
//     // // console.log(await page.$$eval('ul.srp-results .srp-list clearfix', (spans) => {
//     // //     return [...spans].map(span => {
//     // //         return span.innerText
//     // //     })
//     // // }))

//     return data
// }

// const ScrapeDokan = (web) => {
//     const urls = Array.from(getUrls(web));

//     const requests = urls.map(async url => {
//         const res = await fetch(url);
//         const html = await res.text();
//         const $ = load(html);
//         const data = []
//         $(".product-item--vertical").each((i, el) => {
//             const image = load($(el).find(".aspect-ratio noscript").text())
//             const price = $(el).find(".product-item__price-list").text().split("Sale price$")[1].split("CAD")[0]
//             data.push({
//                 title: $(el).find(".product-item__title ").text(),
//                 price: price,
//                 image: image("img").attr("src").slice(2),
//             })
//         })
//         // $("#srp-river-results > ul").each((i, el) => {
//         //     $(el).find("li.s-item").each((i, el) => {
//         //         data.push({
//         //             title: $(el).find(".s-item__link > .s-item__title > span").text(),
//         //             price: $(el).find("span.s-item__price").text(),
//         //             image: $(el).find("div > .s-item__image-section > div > a > div > img").attr("src"),
//         //             date: $(el).find("div > div.s-item__info.clearfix > div.s-item__caption-section > div > span.POSITIVE").text(),
//         //             shipping: $(el).find("div > div.s-item__info.clearfix > div.s-item__details.clearfix > div:nth-child(4) > span").text(),
//         //         })
//         //     })
//         // })
//         return data
//     });
//     return Promise.all(requests);
// }

app.listen(3000, () => {
    console.log("port is listening")
    // scaperWeb("iPhone 10", "Used")
})
