require('dotenv').config();
const express = require('express');
const OpenAI = require('openai');
const logger = require('../winston/logger');
const app = express();
app.use(express.json());

const openai = new OpenAI({
    apiKey: process.env.STORY_OPENAI_API_KEY,
});

class StoryInfo {
    constructor(dogName, writer, story, dogBreed) {
        this.dogName = dogName;
        this.writer = writer;
        this.story = story;
        this.dogBreed = dogBreed;
    }
}

app.post('/create', async (req, res) => {
    const apiName = '스토리 생성 API';
    logger;

    const startTime = Date.now();
    const storyInfo = new StoryInfo(req.body.dogName, req.body.writer, req.body.story, req.body.dogBreed);

    const story_json = [
        {
            summary: 'str',
            title: 'str',
            characters: 'str',
            story: {
                page1: 'str',
                page2: 'str',
                page3: 'str',
                page4: 'str',
                page5: 'str',
                page6: 'str',
            },
        },
    ];

    const content = `동화책의 주인공 ${storyInfo.dogName} 강아지, ${storyInfo.story} 로 만든 줄거리 3문장 내외, 등장인물 3명, 6장의 동화책 이야기 존댓말 응답, 각 페이지 3문장 내외 작성, 응답 한국어, ${story_json} 형태로 답변해`;

    try {
        const completion = await openai.chat.completions.create({
            model: process.env.STORY_GPT_MODEL,
            messages: [{ role: 'system', content: content }],
            temperature: 0.7,
        });

        const assistantContent = completion.choices[0].message.content.trim();

        const processTime = (Date.now() - startTime) / 1000;
        console.log(`/api/user/story API 걸린 시간 ${processTime}s`);
        console.log(`code: 0000, input: ${storyInfo.story}, output: ${assistantContent}`);

        res.json({ result: { code: '0000', input: storyInfo.story, output: assistantContent } });
    } catch (error) {
        console.error('Error during OpenAI call:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = app;
