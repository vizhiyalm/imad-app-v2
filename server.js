var express = require('express');
 var morgan = require('morgan');
 var path = require('path');
 var Pool = require('pg').Pool;
 var crypto = require('crypto');
 var bodyParser = require('body-parser');
 var session = require('express-session');
 
 
 var app = express();
 app.use(morgan('combined'));
 app.use(bodyParser.json());
 app.use(session({
    secret: 'someSecretValue',
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 30}
}));
 
 var config = {
    user: 'vizhiyalm',
    database: 'vizhiyalm',
    host: 'db.imad.hasura-app.io',
    port: '5432',
    password: process.env.DB_PASSWORD
};

function createTemplate (data) {
    var title = data.title;
    var date = data.date;
    var heading = data.heading;
    var content = data.content;
    
    var htmlTemplate = `
    
<html>
    <head>
    	<title>
    	    ${title}
    	</title>
    	<link href="/ui/style.css" rel="stylesheet"  />
    	<meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body>
    <div id="mainDiv">	
        <div>
                  
              </div>
    	<div class="left">
    	    <div class="innerleft">
        		<span class="propic"><img src="../images/propics.png"></span>
        		<h2>KAYALVIZHI</h2>
    		    <h4>Web Designer / Web Developer</h4>
        		
        		<div class="menu">
        			<ul>
        			
                    <li class="listPort"><a href="/" class="sel">Portfolio</a></li>
                     <!--<li class='listBlog'><a href="../#blogPage">Blog</a></li>-->
                     <!--<li><a id="loginnavbar" data-target="#logintab" href="#">Login/Register</a>  </li> -->
                    </ul>
        		</div>
        		
        		<div class="link">
        				<a href="https://www.behance.net/vizhiyalm" target="_blank" class="bhc"><img src="../images/behance.png"></a>
        				<a href="https://www.linkedin.com/" target="_blank" class="lkn"><img src="../images/linkedin.png"></a>
        				<a href="https://github.com/vizhiyalm/imad-2016-app" target="_blank" class="git"><img src="../images/gitub.jpg"></a>
        		</div>
    		</div>
    	</div>
    	
    	<div class="right">
    	    <div class="topic">
    	        <h3>My Blog</h3>
    	        <div class="line"></div>
    	    </div>
    	    <hr>
    	    
    	    <div class="padleft">
    	        <div  style="padding-bottom:30px;">
    	            <span style="float:left;">
    	                <h3 style="color: #0f9d58;">${heading}</h3>
    	            </span>
    	            <span style="float:right;color: #666;font-size:12px;">
    	                ${date.toDateString()}
    	            </span>
    	        </div>
    	   </div>
    	       
                <div class="padleft">
                  ${content}
                </div>
                <div class="comments topic">
    	            <h3>Comments</h3>
    	            <span class="grnline"></span>
    	        </div>
    	        <hr>
        	    <div class="padleft">
                      
                      <div id="comments">
                        <center>Loading comments...</center>
                        <br/>
                        <hr>
                      </div>
                </div>
                
                
                <div id="login_area">
        	        <center>Loading...</center>
        	    </div>
        	    
              
              
    	    </div>
    	</div>
    	</div>
    	<script type="text/javascript" src="../ui/article.js"></script>
        <script type="text/javascript" src="../ui/main.js"></script>
    </body>
</html>
    `;
    return htmlTemplate;
}
 
 app.get('/', function (req, res) {
   res.sendFile(path.join(__dirname, 'ui', 'index.html'));
 });
 
 function hash (input, salt) {
    // How do we create a hash?
    var hashed = crypto.pbkdf2Sync(input, salt, 10000, 512, 'sha512');
    return ["pbkdf2", "10000", salt, hashed.toString('hex')].join('$');
}


app.get('/hash/:input', function(req, res) {
   var hashedString = hash(req.params.input, 'this-is-some-random-string');
   res.send(hashedString);
});

app.post('/create-user', function (req, res) {
   // username, password
   // {"username": "tanmai", "password": "password"}
   // JSON
   var username = req.body.username;
   var password = req.body.password;
   var salt = crypto.randomBytes(128).toString('hex');
   var dbString = hash(password, salt);
   pool.query('INSERT INTO "user" (username, password) VALUES ($1, $2)', [username, dbString], function (err, result) {
      if (err) {
          res.status(500).send(err.toString());
      } else {
          res.send('User successfully created: ' + username);
      }
   });
});

app.post('/login', function (req, res) {
   var username = req.body.username;
   var password = req.body.password;
   
   pool.query('SELECT * FROM "user" WHERE username = $1', [username], function (err, result) {
      if (err) {
          res.status(500).send(err.toString());
      } else {
          if (result.rows.length === 0) {
              res.status(403).send('username/password is invalid');
          } else {
              // Match the password
              var dbString = result.rows[0].password;
              var salt = dbString.split('$')[2];
              var hashedPassword = hash(password, salt); // Creating a hash based on the password submitted and the original salt
              if (hashedPassword === dbString) {
                
                // Set the session
                req.session.auth = {userId: result.rows[0].id};
                // set cookie with a session id
                // internally, on the server side, it maps the session id to an object
                // { auth: {userId }}
                
                res.send('credentials correct!');
                
              } else {
                res.status(403).send('username/password is invalid');
              }
          }
      }
   });
});

app.get('/check-login', function (req, res) {
   if (req.session && req.session.auth && req.session.auth.userId) {
       // Load the user object
       pool.query('SELECT * FROM "user" WHERE id = $1', [req.session.auth.userId], function (err, result) {
           if (err) {
              res.status(500).send(err.toString());
           } else {
              res.send(result.rows[0].username);    
           }
       });
   } else {
       res.status(400).send('You are not logged in');
   }
});

app.get('/logout', function (req, res) {
  delete req.session.auth;
  res.send('<html><body>Logged out!<br/><br/><a href="/">Back to home</a></body></html>');
});




var pool = new Pool(config);

app.get('/get-articles', function (req, res) {
   // make a select request
   // return a response with the results
   pool.query('SELECT * FROM article ORDER BY date DESC', function (err, result) {
      if (err) {
          res.status(500).send(err.toString());
      } else {
          res.send(JSON.stringify(result.rows));
      }
   });
});

app.get('/get-comments/:articleName', function (req, res) {
   // make a select request
   // return a response with the results
   pool.query('SELECT comment.*, "user".username FROM article, comment, "user" WHERE article.title = $1 AND article.id = comment.article_id AND comment.user_id = "user".id ORDER BY comment.timestamp DESC', [req.params.articleName], function (err, result) {
      if (err) {
          res.status(500).send(err.toString());
      } else {
          res.send(JSON.stringify(result.rows));
      }
   });
});

app.post('/submit-comment/:articleName', function (req, res) {
   // Check if the user is logged in
    if (req.session && req.session.auth && req.session.auth.userId) {
        // First check if the article exists and get the article-id
        pool.query('SELECT * from article where title = $1', [req.params.articleName], function (err, result) {
            if (err) {
                res.status(500).send(err.toString());
            } else {
                if (result.rows.length === 0) {
                    res.status(400).send('Article not found');
                } else {
                    var articleId = result.rows[0].id;
                    // Now insert the right comment for this article
                    pool.query(
                        "INSERT INTO comment (comment, article_id, user_id) VALUES ($1, $2, $3)",
                        [req.body.comment, articleId, req.session.auth.userId],
                        function (err, result) {
                            if (err) {
                                res.status(500).send(err.toString());
                            } else {
                                res.status(200).send('Comment inserted!');
                            }
                        });
                }
            }
       });     
    } else {
        res.status(403).send('Only logged in users can comment');
    }
});
 
 
app.get('/articles/:articleName', function (req, res) {
  // SELECT * FROM article WHERE title = '\'; DELETE WHERE a = \'asdf'
  pool.query("SELECT * FROM article WHERE title = $1", [req.params.articleName], function (err, result) {
    if (err) {
        res.status(500).send(err.toString());
    } else {
        if (result.rows.length === 0) {
            res.status(404).send('Article not found');
        } else {
            var articleData = result.rows[0];
            res.send(createTemplate(articleData));
        }
    }
  });
});

           


 app.get('/ui/:fileName', function (req, res) {
  res.sendFile(path.join(__dirname, 'ui', req.params.fileName));
});
 
app.use("/images", express.static(__dirname+'/images')); 

 
 
 var port = 8080; // Use 8080 for local development because you might already have apache running on 80
app.listen(8080, function () {
  console.log(`IMAD course app listening on port ${port}!`);
});
Contact GitHub API Training Shop Blog About
