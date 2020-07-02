'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
require('dotenv').config();
var cors = require('cors');
var app = express();
// Basic Configuration 
var port = process.env.PORT || 3000;
/** this project needs a db !! **/
mongoose.connect(process.env.DB_URI, {useNewUrlParser: true, useUnifiedTopology: true});
app.use(cors());

const Schema = mongoose.Schema;
const urlPairSchema = new Schema({
    "original": {type: String, required: true},
    "short": {type: String, required: true, unique: true}
});
const UrlPair = mongoose.model("URL_Pair", urlPairSchema);
const counterSchema = new Schema({
    "for": {type: String, required: true, unique: true},
    "counter": {type: Number, default: 0, required: true}
});
const Counter = mongoose.model("Counter", counterSchema);

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: false}));

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
});

app.post('/api/shorturl/new', (req, res) => {
    try {
        const url = new URL(req.body.url);
        const dns = require('dns');
        dns.lookup(url.hostname, (error) => {
            if (error)
                res.json({"error": "invalid URL"});
            else {
                Counter.findOneAndUpdate({"for": "URL_Pair"}, {$inc: {"counter": 1}}, {
                    upsert: true
                }, (counterErr, counter) => {
                    if (counterErr) res.json({"counterErr": counterErr});
                    else {
                        const newPair = new UrlPair({"original": url, "short": counter.counter+""});
                        console.log(newPair);
                        newPair.save((saveErr, pair) => {
                            if (saveErr) res.json({"saveErr": saveErr});
                            else res.json({"original_url": url, "short_url": pair.short})
                        })
                    }
                });
            }

        });
    } catch (e) {
        res.json({"error": "invalid URL"});
    }

});

app.get('/api/shorturl/:short', (req,res, next)=>{
    const short = req.params.short;
    if(!short) res.send("Invalid short url!");
    UrlPair.findOne({"short":short}, (err, pair) => {
        if(err) next(err);
        if(!pair) res.send({"Error": "Short URL not found!"});
        else res.redirect(pair.original);
    })

});

app.listen(port, function () {
    console.log('Node.js listening ...');
});