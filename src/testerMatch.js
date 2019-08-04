var Redis = require('ioredis');
var redisConnection = new Redis('redis-19702.c15.us-east-1-2.ec2.cloud.redislabs.com', 19702, {password: 'p1p2p3p4p5p6'});
const https = require('https');
var dic = [];

function getUUIDfromAPI(name){
    https.get(`https://api.mojang.com/users/profiles/minecraft/${name}`, (response)=>{
    let data  = '';

    response.on('data', (chunk) => {
        data += chunk;
      });
    
      // The whole response has been received. Print out the result.
      response.on('end', () => {
        dic.push(JSON.parse(data));
      });

    }).on('error', (err)=>{
        console.log(err);
});
}
getUUIDfromAPI('Aleiv');
getUUIDfromAPI('AssasinJianer25');

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

setTimeout(() => {
    dic.forEach(function(item){
        var json = {'UUID':item.id, 'MatchType': 'Ranked', 'LadderType': 'BuildUHC', 'Time': `${Date.now()}`, 'Elo': `${1400 + getRandomInt(100, 200)}`};
        console.log(json);
        redisConnection.publish('Matchmaking', JSON.stringify(json));

    });
    process.exit(1);
    
}, 500);

