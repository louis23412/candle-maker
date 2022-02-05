const fs = require('fs');
const hive = require('@hiveio/hive-js');
const {
    updateRate, candleSize, candleLimit, keepCandles, broadcast, bUser, bKey
} = JSON.parse(fs.readFileSync('./settings.json'));

let globalState = {
    candleCounter : 0,
    priceUpdateErrors : 0,
    candleBroadcastErrors: 0,
    candleDataBase : [],
    tempPriceHolder1 : [],
    tempPriceHolder2 : [],
    tempPriceHolder3 : []
};

const saveCandles = () => {
    if (keepCandles == true) {
        fs.writeFileSync('./candleDump.json', JSON.stringify(globalState.candleDataBase))
    }
}

const createCandle = (startTime, endTime) => {
    globalState.candleCounter++;
    globalState.candleDataBase.push({
        start : new Date(startTime - Math.abs(new Date().getTimezoneOffset())).toISOString(),
        end : new Date(endTime - Math.abs(new Date().getTimezoneOffset())).toISOString(),
        candleNum : globalState.candleCounter,
        candleSecs : (endTime - startTime) / 1000,

        latest : {
            open : globalState.tempPriceHolder1[0],
            high : Math.max(...globalState.tempPriceHolder1),
            close : globalState.tempPriceHolder1[globalState.tempPriceHolder1.length -1],
            low : Math.min(...globalState.tempPriceHolder1)
        },

        lowestAsk : {
            open : globalState.tempPriceHolder2[0],
            high : Math.max(...globalState.tempPriceHolder2),
            close : globalState.tempPriceHolder2[globalState.tempPriceHolder2.length -1],
            low : Math.min(...globalState.tempPriceHolder2)
        },

        highestBid : {
            open : globalState.tempPriceHolder3[0],
            high : Math.max(...globalState.tempPriceHolder3),
            close : globalState.tempPriceHolder3[globalState.tempPriceHolder3.length -1],
            low : Math.min(...globalState.tempPriceHolder3)
        }
    })

    globalState.tempPriceHolder1 = [];
    globalState.tempPriceHolder2 = [];
    globalState.tempPriceHolder3 = [];
    
    console.log('----------------------')
    console.log(`Candle created! #${globalState.candleCounter}`)

    if (broadcast) {
        console.log('Broadcasting now...')
        broadcastCandle()
    }
    console.log('----------------------')
    saveCandles();
}

const broadcastCandle = () => {
    const json = JSON.stringify(globalState.candleDataBase.slice(-1)[0]);

    try {
        hive.broadcast.customJson(bKey, [], [bUser], `${bUser}-candleMaker`, json, function(err, result) {
            if (err) {
                globalState.candleBroadcastErrors++;
            } else {
                console.log(`Broadcast success!`);
            }
        });
    } catch (error) {
        globalState.candleBroadcastErrors++;
    } 
}

const updatePrice = () => {
    new Promise((resolve, reject) => {
        setTimeout( async () => {
            const timeDiff = (((new Date().getTime() - globalState.lastUpdate) / 1000))

            console.log(`*Price updated! => time diff: ${timeDiff} - Current candles: ${globalState.candleDataBase.length} / ${candleLimit} (Price check errors: ${globalState.priceUpdateErrors} - Candle broadcast errors: ${globalState.candleBroadcastErrors})`)
            globalState.lastUpdate = new Date().getTime()

            if (globalState.lastUpdate - globalState.lastCandleCreated >= (candleSize * 60) * 1000) {
                createCandle(globalState.lastCandleCreated, globalState.lastUpdate)
                globalState.lastCandleCreated = globalState.lastUpdate;
            }

            if (globalState.candleDataBase.length == candleLimit + 1) {
                globalState.candleDataBase.shift();
            }

            try {
                hive.api.getTicker(function(err, data) {
                    if (data) {
                        globalState.tempPriceHolder1.push(Number(data.latest))
                        globalState.tempPriceHolder2.push(Number(data.lowest_ask))
                        globalState.tempPriceHolder3.push(Number(data.highest_bid))
                    } else {
                        globalState.priceUpdateErrors++;
                    }
                });
            } catch (error) {
                globalState.priceUpdateErrors++;
            }
            updatePrice();
        }, updateRate * 1000)
    })
}

const main = () => {
    globalState.startingTime = new Date().getTime()
    globalState.lastUpdate = globalState.startingTime;
    globalState.lastCandleCreated = globalState.startingTime;

    console.log('Starting...')
    updatePrice();
}

main();