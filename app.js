var express = require('express');
var path = require('path');
var request = require('request');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cheerio = require('cheerio');
var MongoClient = require('mongodb').MongoClient;

var index = require('./routes/index');
var users = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/users', users);
app.get('/scrape', function (req, res) {
    var url = 'http://www.commitstrip.com/en/2017/01/';
    request(url, function (error, response, html) {

        // First we'll check to make sure no errors occurred when making the request

        if (!error) {
            // Next, we'll utilize the cheerio library on the returned html which will essentially give us jQuery functionality

            var $ = cheerio.load(html);

            // Finally, we'll define the variables we're going to capture

            var title, frontImage, mainImage;
            var json = {title: "", frontImage: "", mainImage: ""};

            $('section > a').filter(function () {
                var data = $(this);
                //console.log(data);
                title = data.children().last().children().text();
                frontImage = data.children().first().attr('src');
                link = data.attr('href');

                //console.log("asd", mainImg)
                json.title = title;
                json.frontImage = frontImage;

                request(link, function (error, res, newHtml) {
                    var mainImg = "";
                    if (!error) {
                        var $ = cheerio.load(newHtml);
                        $('.entry-content > p > img').filter(function () {
                            mainImg = $(this).attr('src');

                        })
                        json.mainImage = mainImg;
                        //console.log(json);
                        MongoClient.connect('mongodb://localhost:27017/commitStrip', function (err, db) {
                            if (err) throw err;
                            db.collection('strips').insertOne({
                                "title": title,
                                "frontImage": frontImage,
                                "mainImage": mainImg,
                                "imageYear": 2017,
                                "imageMonth": 1
                            }, function (err, result) {
                                if (err) throw err;

                                console.log(result);
                            });
                            // db.collection('strips').find().toArray(function (err, result) {
                            //     if (err) throw err
                            //
                            //     console.log(result)
                            // })
                        })
                    }
                });
                //json.mainImage = mainImg;
                //console.log(json)
            })


        }
    })
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});


module.exports = app;
