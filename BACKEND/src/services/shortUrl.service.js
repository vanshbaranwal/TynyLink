import { generateNanoId } from "../utils/helper.js";
import urlSchema from "../models/shortUrl.model.js";
import { getCustomShortUrl, saveShortUrl } from "../dao/shortUrl.js";

export const createShortUrlWithoutUser = async (url) => {
    const shortUrl = generateNanoId(7);
    if(!shortUrl){
        throw new Error("short url not generated");
    }
    await saveShortUrl(shortUrl, url);
    return shortUrl;
};

export const createShortUrlWithUser = async (url, userId, slug=null) => {
    const shortUrl = slug || generateNanoId(7);
    const exists = await getCustomShortUrl(slug);
    if(exists) throw new Error("this custom url already exists");

    await saveShortUrl(shortUrl, url, userId);
    return shortUrl;
};