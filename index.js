// This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
// Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
// session persistence, api calls, and more.
const Alexa = require('ask-sdk-core');
const persistenceAdapter = require('ask-sdk-s3-persistence-adapter');


const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    async handle(handlerInput) {
        const attributesManager = handlerInput.attributesManager;
        //const s3Attributes = await attributesManager.getPersistentAttributes() || {};
        let s3Attributes = await attributesManager.getPersistentAttributes() || [{meta: {bootCount: 0}}];
        
        console.dir(`s3Attributesの状態：${s3Attributes[0]}`);
        //let bootCount = s3Attributes[0].meta.hasOwnProperty('bootCount')? s3Attributes[0].meta.bootCount : undefined; 
        //let bootCount = s3Attributes ? s3Attributes[ s3Attributes.length -1 ].meta.bootCount : 0
        //let bootCount = s3Attributes === undefined ? 0: s3Attributes[ s3Attributes.length -1 ].meta.bootCount;
        //let bootCount = s3Attributes[0].hasOwnProperty('meta') ? s3Attributes[ s3Attributes.length -1 ].meta.bootCount :0;
        console.dir(`s3Attributes[ s3Attributes.length -1 ]の中身：${s3Attributes[ s3Attributes.length -1 ]}`);
        let bootCount = s3Attributes[0] === undefined ? 0: s3Attributes[ s3Attributes.length -1 ].meta.bootCount;
        console.log(`hasOwnPropertyの状態：${s3Attributes.hasOwnProperty('bootCount')}`);                                                                                                 　

        if(bootCount === 0){
            const speakOutput = `ようこそ排便管理スキルへ！このスキルではあなたの排便状態を記録し、私が管理をしてあげます。初めてだと緊張しちゃいますよね？うんちが出たら、私に長さ、色、柔らかさを教えて下さい。`;
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt(speakOutput)
                .getResponse();
        }
        bootCount = ++bootCount;
        const speakOutput = `排便管理スキルの起動ありがとうございます。${bootCount}回目の排便ですね。早速ですが、長さ、色、柔らかさを教えて下さい。`;
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
const unkoStatusIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'unkoStatusIntent';
    },
    async handle(handlerInput) {
        let saveData;
        const attributesManager = handlerInput.attributesManager;
        const s3Attributes = await attributesManager.getPersistentAttributes() || {};
        let bootCount = s3Attributes[0] === undefined ? 0: s3Attributes[ s3Attributes.length -1 ].meta.bootCount;
        
        const voiceLength = Alexa.getSlotValue(handlerInput.requestEnvelope, 'length');
        const voiceUnit = Alexa.getSlotValue(handlerInput.requestEnvelope, 'unit');
        const voiceColor = Alexa.getSlotValue(handlerInput.requestEnvelope, 'color');
        const voiceSoft = Alexa.getSlotValue(handlerInput.requestEnvelope, 'soft');

        
        //セッションアトリビュートを取得
        const attributes = attributesManager.getSessionAttributes();
        
        let unkoLength = voiceLength || attributes.length;
        let unit = voiceUnit|| attributes.unit;
        let color = voiceColor || attributes.color;
        let soft = voiceSoft || attributes.soft;

        
        //単位変換実装予定

        const speakOutput = `長さは${unkoLength}センチ、色は${color}、柔らかさは${soft}ですね。ありがとうございます。`;
        
        bootCount = ++bootCount;
        
        /*
        const newSavedata = {
            status:{
                "bootCount":bootCount,
                "length":length,
                "color":color,
                "soft":soft
            }
        };
        */
        
        const newSavedata = {
            meta: {
                //createdAt: date, //未定義
                bootCount: bootCount,
                
            },
            contents: {
                unkoLength: unkoLength,
                color: color,
                soft: soft,
            },
        }
        
　　　　console.log("新しく記録するデータ：" + JSON.stringify(newSavedata));
        console.log("S3から読み込んだデータ：" + JSON.stringify(s3Attributes));
        
        if(bootCount === 1){
            console.log(`【初回起動のとき】`);
            saveData = newSavedata;
        }else if(bootCount !== 1){ //ここテキトー
        console.log(`【起動回数2以上のとき】`);
        //saveData = s3Attributes.push(newSavedata);
        //saveData = s3Attributes.prototype.push.apply(newSavedata); //TypeError: Cannot read property 'push' of undefined
        /*永谷案
        saveData = s3Attributes.concat();
        saveData.push(newSavedata);
        */
        s3Attributes.push(newSavedata);
        saveData = s3Attributes;
        }
        console.dir(`起動回数：${bootCount}`);
        console.log("結合済みセーブデータ：" + JSON.stringify(saveData));
        
        //永続アトリビュートに保存する処理
        attributesManager.setPersistentAttributes(saveData);
        await attributesManager.savePersistentAttributes();

        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};
const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    async handle(handlerInput) {
        const speakOutput = 'Goodbye!';
        
        //起動回数をリセットする
        /*
        const attributesManager = handlerInput.attributesManager;
        let bootCount = {"bootCount":0};
        attributesManager.setPersistentAttributes(bootCount);
        await attributesManager.deletePersistentAttributes();
        */
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    }
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.stack}`);
        const speakOutput = `Sorry, I had trouble doing what you asked. Please try again.`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        unkoStatusIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler, // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    )
    .addErrorHandlers(
        ErrorHandler,
    )
        .withPersistenceAdapter(
         new persistenceAdapter.S3PersistenceAdapter({bucketName:'amzn1-ask-skill-821aa377-a5ea-buildsnapshotbucket-1ku4vcse68w5x'})
    )
    .lambda();
