import urlSchema from "../models/shortUrl.model.js"
import { ConflictError } from "../utils/errorHandler.js";

export const saveShortUrl = async (shortUrl, longUrl, userId) => {
    try {
        
        const newUrl = new urlSchema({
            full_url: longUrl,
            short_url: shortUrl
        });
    
        if(userId){
            newUrl.user = userId;
        }
    
        await newUrl.save();
    } catch (error) {
        if(error.code === 1100){
            throw new ConflictError("short url already exists");
        }
        throw error;    
    }
};

export const getShortUrl = async(shortUrl) => {
    return await urlSchema.findOneAndUpdate({ short_url: shortUrl }, { $inc: { clicks: 1 } });
};

export const getCustomShortUrl = async(slug) => {
    return await urlSchema.findOne({ short_url: slug });
};