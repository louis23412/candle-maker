* Clone this repo & cd into it <br>
`git clone https://github.com/louis23412/candle-maker.git && cd candle-maker` <br>

* Install dependencies <br>
`npm install`

* Open __settings.json__ & change as needed. <br>
   ```
   {
    "updateRate" : 5,
    "candleSize" : 1,
    "candleLimit" : 500,
    "keepCandles" : false,

    "broadcast" : true,
    "bUser" : "usernameHere",
    "bKey" : "privatePostingKeyHere"
   }
   ```


   If you choose to active broadcasting, then for [security reasons](https://hive.blog/faq.html#Why_should_I_be_careful_with_my_master_password), only use your posting key(s)!
   
* Save the config file, then run the bot <br>
   `npm start`