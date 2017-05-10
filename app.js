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
    for (var j = 1; j <= 12; j++) {
        var stripData = {
            url: 'http://www.commitstrip.com/en/2014/' + ('0' + j).slice(-2) + '/',
            month: j,
            year: 2014
        };
        (function(stripData) {
            request(stripData.url, function (error, response, html) {

                // First we'll check to make sure no errors occurred when making the request

                if (!error) {
                    // Next, we'll utilize the cheerio library on the returned html which will essentially give us jQuery functionality

                    var $ = cheerio.load(html);

                    // Finally, we'll define the variables we're going to capture

                    var title, frontImage, mainImage;
                    var strips = [];
                    $('section > a').filter(function () {
                        var data = $(this);
                        //console.log(data);
                        title = data.children().last().children().text();
                        frontImage = data.children().first().attr('src');
                        link = data.attr('href');

                        //console.log("asd", mainImg)
                        strips.push({
                            title: title,
                            frontImage: frontImage,
                            link: link,
                            month: stripData.month,
                            year: stripData.year
                        });
                    });

                    for (var i = 0; i < strips.length; i++) {
                        var asd = strips[i];
                        (function (asd) {
                            request({uri: asd.link}, function (error, res, newHtml) {
                                if (!error) {
                                    var $ = cheerio.load(newHtml);
                                    var mainImg;
                                    $('.entry-content > p > img').filter(function () {
                                        mainImg = $(this).attr('src');

                                    });

                                    MongoClient.connect('mongodb://localhost:27017/commitStrip', function (err, db) {
                                        if (err) throw err;
                                        db.collection('strips').insertOne({
                                            "title": asd.title,
                                            "frontImage": asd.frontImage,
                                            "mainImage": mainImg,
                                            "imageYear": asd.year,
                                            "imageMonth": asd.month
                                        }, function (err, result) {
                                            if (err) throw err;

                                            console.log(result);
                                        });
                                    })
                                }
                            });
                        })(asd);

                    }
                }
            })
        })(stripData);

    }


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
