const hive = require('@hiveio/hive-js');

const candleLimit = 25;

let globalState = {
    candleCounter : 0
};

let lastPriceState = {};

let candleDataBase = [];

let tempPriceHolder = [];

const createCandle = (startTime, endTime) => {
    const highPrice = Math.max(...tempPriceHolder);
    const lowPrice = Math.min(...tempPriceHolder);
    const openPrice = tempPriceHolder[0];
    const closePrice = tempPriceHolder[tempPriceHolder.length -1]

    candleDataBase.push({
        start : startTime,
        endTime : endTime,
        candleTimeSize : (endTime - startTime) / 1000,
        open : openPrice,
        high : highPrice,
        close : closePrice,
        low : lowPrice
    })

    tempPriceHolder = [];
    globalState.candleCounter++;
    
    console.log('----------------------')
    console.log(`Candle created! #${globalState.candleCounter}`)
    console.log(`Open:${openPrice} - High: ${highPrice} - Low: ${lowPrice} - Close: ${closePrice}`);
    console.log('----------------------')
}

const updatePrice = () => {
    new Promise((resolve, reject) => {
        setTimeout( async () => {
            const timeDiff = (((new Date().getTime() - globalState.lastUpdate) / 1000))

            console.log(`Price updated(${lastPriceState.highest_bid})! => time diff: ${timeDiff} - Current candles: ${candleDataBase.length} / ${candleLimit}`)
            globalState.lastUpdate = new Date().getTime()

            if (globalState.lastUpdate - globalState.lastCandleCreated > 60000) {
                createCandle(globalState.lastCandleCreated, globalState.lastUpdate)
                globalState.lastCandleCreated = globalState.lastUpdate;
            }

            if (candleDataBase.length == candleLimit + 1) {
                candleDataBase.shift();
            }

            hive.api.getTicker(function(err, data) {
                lastPriceState = {
                    latest : data.latest,
                    lowest_ask : data.lowest_ask,
                    highest_bid : data.highest_bid
                }
                tempPriceHolder.push(Number(data.highest_bid))
            });
            updatePrice();
        }, 5000)
    })
}

const candleBuilder = async () => {
    globalState.startingTime = new Date().getTime()
    globalState.lastUpdate = globalState.startingTime;
    globalState.lastCandleCreated = globalState.startingTime;

    console.log('Starting...')
    updatePrice();
}


candleBuilder();