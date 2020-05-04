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
        
        //let bootCount = s3Attributes[0].meta.hasOwnProperty('bootCount')? s3Attributes[0].meta.bootCount : undefined; 
        //let bootCount = s3Attributes ? s3Attributes[ s3Attributes.length -1 ].meta.bootCount : 0
        //let bootCount = s3Attributes === undefined ? 0: s3Attributes[ s3Attributes.length -1 ].meta.bootCount;
        //let bootCount = s3Attributes[0].hasOwnProperty('meta') ? s3Attributes[ s3Attributes.length -1 ].meta.bootCount :0;
        let bootCount = s3Attributes[0] === undefined ? 0: s3Attributes[ s3Attributes.length -1 ].meta.bootCount;

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
            //&& handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED';
    },
    async handle(handlerInput) {
        let saveData;
        const dialogState = handlerInput.requestEnvelope.request.dialogState;
        const confirmationStatus = handlerInput.requestEnvelope.request.intent.confirmationStatus;
        const attributesManager = handlerInput.attributesManager;
        const s3Attributes = await attributesManager.getPersistentAttributes() || {};
        let bootCount = s3Attributes[0] === undefined ? 0: s3Attributes[ s3Attributes.length -1 ].meta.bootCount;
        
        const voiceLength = Alexa.getSlotValue(handlerInput.requestEnvelope, 'unkoLength');
        const voiceUnit = Alexa.getSlotValue(handlerInput.requestEnvelope, 'unit');
        const voiceColor = Alexa.getSlotValue(handlerInput.requestEnvelope, 'color');
        const voiceSoft = Alexa.getSlotValue(handlerInput.requestEnvelope, 'soft');
        
        
        //セッションアトリビュートを取得
        const attributes = attributesManager.getSessionAttributes();
        
        let unkoLength = voiceLength || attributes.unkoLength;
        let unit = voiceUnit || attributes.unit;
        let color = voiceColor || attributes.color;
        let soft = voiceSoft || attributes.soft;

        const slots = handlerInput.requestEnvelope.request.intent.slots;
        //const er_unkoLength = slots.unkoLength.resolutions.resolutionsPerAuthority[0].status.code || undefined;
        //const er_color = slots.color.resolutions.resolutionsPerAuthority[0].status.code || undefined;
        const er_unit = slots.unit.resolutions.resolutionsPerAuthority[0].status.code || undefined;
        const er_soft = slots.soft.resolutions.resolutionsPerAuthority[0].status.code || undefined;
        
        //単位変換実装予定

        // ダイアログモデルのスロット質問中の場合
        if (dialogState !== 'COMPLETED') {
            return handlerInput.responseBuilder
                .addDelegateDirective()
                .getResponse();
        // ダイアログモデルのスロットが全て埋まった場合
        } else {
            // Alexa応答に対して「いいえ」発話時
            if (confirmationStatus !== 'CONFIRMED') {
                console.log('いいえと回答した分岐に入った'); //いいえと答えると分岐することは確認できた
                let updatedIntent = handlerInput.requestEnvelope.request.intent;
                updatedIntent.confirmationStatus = "IN_PROGRESS";
                return handlerInput.responseBuilder
                .speak('すみません。もう一度、長さから教えてもらえませんか？')
                .addElicitSlotDirective('unkoLength','color','soft', updatedIntent)
                .reprompt('もう一度、長さから教えてもらせませんか？。')
                .getResponse();
                //予約確認Alexa応答に対して「はい」発話時
                //回答がおかしかった時
                } 
                /*
                else {
                    if(er_soft === "ER_SUCCESS_NO_MATCH" ){
                        let updatedIntent = handlerInput.requestEnvelope.request.intent;
                        updatedIntent.confirmationStatus = "IN_PROGRESS";
                        return handlerInput.responseBuilder
                        .speak(`柔らかさを${voiceSoft}と答えてもらいましたが、思っていた回答と違いました。すみませんが、もう一度、柔らかさを教えてもらえませんか？`)
                        .addElicitSlotDirective('soft', updatedIntent)
                        .reprompt('もう一度、柔らかさを教えてもらえませんか？')
                        .getResponse(); 
                    }
                }
                */
                //予約確認Alexa応答に対して「はい」発話時
                //回答が同義語に一致していた場合
                const speakOutput = `長さは${unkoLength}センチ、色は${color}、柔らかさは${soft}ですね。ありがとうございます。`;
                
                //起動回数をインクリメント
                bootCount = ++bootCount;

                //柔らかさの同義語を統一する        
                const trueSoft = slots.soft.resolutions.resolutionsPerAuthority[0].values[0].value.name || undefined;
                
                //新しいセーブデータを作成
                const newSavedata = {
                    meta: {
                        //createdAt: date, //未定義
                        bootCount: bootCount,
                    },
                    contents: {
                        unkoLength: parseInt(unkoLength),
                        color: color,
                        soft: trueSoft
                    },
                }

                //初回起動のときは新しいセーブデータをそのまま保存
                if(bootCount === 1){
                    saveData = [newSavedata];
                //2回目以降は既存セーブデータに新しいセーブデータを結合させる
                }else if(bootCount !== 1){ 
                    s3Attributes.push(newSavedata);
                    saveData = s3Attributes;
                }

                //永続アトリビュートに保存する処理
                attributesManager.setPersistentAttributes(saveData);
                await attributesManager.savePersistentAttributes();
                
                return handlerInput.responseBuilder
                .speak(speakOutput)
                .withShouldEndSession(true)
                .getResponse();            
        }

    }
};

//集計インテント。今までの記録を集計してしゃべらせる。
const AggregateHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AggregateIntent';
    },
    async handle(handlerInput) {
        const attributesManager = handlerInput.attributesManager;
        const s3Attributes = await attributesManager.getPersistentAttributes() || {};
        let bootCount = s3Attributes[0] === undefined ? 0: s3Attributes[ s3Attributes.length -1 ].meta.bootCount;
        
        //うんこの長さの配列
        let unkoLengthArray = s3Attributes.map(item => item.contents.unkoLength);
        //色の配列
        let colorArray = s3Attributes.map(item => item.contents.color);
        //うんこの柔らかさの配列
        let softArray = s3Attributes.map(item => item.contents.soft);
        
        //長さの最大値、最小値を取得して、要素の位置を元々のセーブデータで検索する
        const aryMax = function (a, b) {return Math.max(a, b);}
        const aryMin = function (a, b) {return Math.min(a, b);}
        let unkoLengthMax = unkoLengthArray.reduce(aryMax);
        let unkoLengthMin = unkoLengthArray.reduce(aryMin);
        let maxPlace = unkoLengthArray.lastIndexOf(unkoLengthMax);
        let minPlace = unkoLengthArray.lastIndexOf(unkoLengthMin);
        let maxDate = s3Attributes[maxPlace].meta.bootCount; //今後日時になおすか加える。
        let minDate = s3Attributes[minPlace].meta.bootCount; //今後日時になおす加える。
        console.log( unkoLengthArray);
        
        const speakOutput = `集計用インテントです。記録した回数は${bootCount}回です。一番長かったのは、直近では${maxDate}回目の${unkoLengthMax}センチ、一番短かったのは${minDate}回目の${unkoLengthMin}センチです。`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'このスキルでは、あなたの排便状態を記録しておけます。例えば、長さは三センチで色は黒で柔らかさはねっとりとおっしゃって下さい。先に長さだけを言ってもらっても大丈夫ですよ。';

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
        AggregateHandler,
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
