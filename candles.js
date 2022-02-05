const fs = require('fs');
const hive = require('@hiveio/hive-js');
const {
    updateRate, candleSize, candleLimit, keepCandles, priceMode, broadcast, bRate, bUser, bKey
} = JSON.parse(fs.readFileSync('./settings.json'));

let globalState = {
    candleCounter : 0,
    priceUpdateErrors : 0,
    candleBroadcastErrors: 0,
    lastPriceState : {},
    candleDataBase : [],
    tempPriceHolder : []
};

const saveCandles = () => {
    if (keepCandles == true) {
        fs.writeFileSync('./candleDump.json', JSON.stringify(globalState.candleDataBase))
    }
}

const createCandle = (startTime, endTime) => {
    globalState.candleCounter++;

    const highPrice = Math.max(...globalState.tempPriceHolder);
    const lowPrice = Math.min(...globalState.tempPriceHolder);
    const openPrice = globalState.tempPriceHolder[0];
    const closePrice = globalState.tempPriceHolder[globalState.tempPriceHolder.length -1]

    globalState.candleDataBase.push({
        candleNum : globalState.candleCounter,
        start : startTime,
        endTime : endTime,
        candleTimeSize : (endTime - startTime) / 1000,
        open : openPrice,
        high : highPrice,
        close : closePrice,
        low : lowPrice
    })

    globalState.tempPriceHolder = [];
    
    console.log('----------------------')
    console.log(`Candle created! #${globalState.candleCounter}`)
    console.log(`Open:${openPrice} - High: ${highPrice} - Low: ${lowPrice} - Close: ${closePrice}`);

    if (broadcast && globalState.candleCounter % bRate == 0) {
        console.log('Broadcasting now...')
        broadcastCandle()
    }
    console.log('----------------------')
    saveCandles();
}

const updatePrice = () => {
    new Promise((resolve, reject) => {
        setTimeout( async () => {
            const timeDiff = (((new Date().getTime() - globalState.lastUpdate) / 1000))

            console.log(`*Price updated(${globalState.lastPriceState.highest_bid})! => time diff: ${timeDiff} - Current candles: ${globalState.candleDataBase.length} / ${candleLimit}`)
            console.log(`(Price check errors: ${globalState.priceUpdateErrors} - Candle broadcast errors: ${globalState.candleBroadcastErrors})`)
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
                        globalState.lastPriceState = {
                            latest : data.latest,
                            lowest_ask : data.lowest_ask,
                            highest_bid : data.highest_bid
                        }
        
                        if (priceMode == 0) {
                            globalState.tempPriceHolder.push(Number(data.latest))
                        } else if (priceMode == 1) {
                            globalState.tempPriceHolder.push(Number(data.lowest_ask))
                        } else if (priceMode == 2) {
                            globalState.tempPriceHolder.push(Number(data.highest_bid))
                        }
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

const broadcastCandle = () => {
    let pMode = '';

    if (priceMode == 0) {
        pMode = 'latest'
    } else if (priceMode == 1) {
        pMode = 'lowest_ask'
    } else if (priceMode == 2) {
        pMode = 'highest_bid'
    }

    const lastNCandles = globalState.candleDataBase.slice(-Math.abs(bRate))

    const json = JSON.stringify(['custom_json', {
        priceMode : pMode,
        candleQty : bRate,
        candles : lastNCandles
    }]);

    const id = `${bUser}-candleMaker`

    try {
        hive.broadcast.customJson(bKey, [], [bUser], id, json, function(err, result) {
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

const main = () => {
    globalState.startingTime = new Date().getTime()
    globalState.lastUpdate = globalState.startingTime;
    globalState.lastCandleCreated = globalState.startingTime;

    console.log('Starting...')
    updatePrice();
}

main();