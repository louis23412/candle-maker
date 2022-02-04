const fs = require('fs');
const hive = require('@hiveio/hive-js');
const {candleLimit, keepCandles, priceMode} = JSON.parse(fs.readFileSync('./settings.json'));

let globalState = {
    candleCounter : 0,
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
    const highPrice = Math.max(...globalState.tempPriceHolder);
    const lowPrice = Math.min(...globalState.tempPriceHolder);
    const openPrice = globalState.tempPriceHolder[0];
    const closePrice = globalState.tempPriceHolder[globalState.tempPriceHolder.length -1]

    globalState.candleDataBase.push({
        start : startTime,
        endTime : endTime,
        candleTimeSize : (endTime - startTime) / 1000,
        open : openPrice,
        high : highPrice,
        close : closePrice,
        low : lowPrice
    })

    globalState.tempPriceHolder = [];
    globalState.candleCounter++;
    
    console.log('----------------------')
    console.log(`Candle created! #${globalState.candleCounter}`)
    console.log(`Open:${openPrice} - High: ${highPrice} - Low: ${lowPrice} - Close: ${closePrice}`);
    console.log('----------------------')
    saveCandles();
}

const updatePrice = () => {
    new Promise((resolve, reject) => {
        setTimeout( async () => {
            const timeDiff = (((new Date().getTime() - globalState.lastUpdate) / 1000))

            console.log(`Price updated(${globalState.lastPriceState.highest_bid})! => time diff: ${timeDiff} - Current candles: ${globalState.candleDataBase.length} / ${candleLimit}`)
            globalState.lastUpdate = new Date().getTime()

            if (globalState.lastUpdate - globalState.lastCandleCreated > 60000) {
                createCandle(globalState.lastCandleCreated, globalState.lastUpdate)
                globalState.lastCandleCreated = globalState.lastUpdate;
            }

            if (globalState.candleDataBase.length == candleLimit + 1) {
                globalState.candleDataBase.shift();
            }

            hive.api.getTicker(function(err, data) {
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
                
            });
            updatePrice();
        }, 5000)
    })
}

const main = async () => {
    globalState.startingTime = new Date().getTime()
    globalState.lastUpdate = globalState.startingTime;
    globalState.lastCandleCreated = globalState.startingTime;

    console.log('Starting...')
    updatePrice();
}


main();