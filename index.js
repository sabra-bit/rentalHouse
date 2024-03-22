const express = require('express');
var bodyParser = require('body-parser');
const multer = require('multer');
const app = express();

const flash = require('connect-flash');
var session = require('express-session');

const upload = multer({ limits: { fileSize: 9000000 }  });
function addDatetimeToRequest(req, res, next) {
  const now = new Date();
  req.datetime = {
    all :now,
    date: now.toISOString().split('T')[0],
    time: now.toLocaleTimeString(),
  };
  next();
}
app.use(addDatetimeToRequest);
app.use(bodyParser.json());
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data/dataBase.db');
// Keep the connection open throughout your application's lifespan
app.use((req, res, next) => {
  req.db = db;
  next();
});
// Close the connection when the application exits
app.on('close', () => db.close());
app.use(session({ cookie: { maxAge: 10000 * 60 * 60, },  // 1 hour in milliseconds
    secret: 'woot',
    resave: false, 
    saveUninitialized: false}));
// Use flash middleware
app.use(flash());
// create application/json parser
var jsonParser = bodyParser.json()
// create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false })





app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error clearing session');
    } else {
      res.redirect('/');

    }
  });
});


app.post('/search',urlencodedParser,  (req, res) => {
  // Set flash message (assuming successful login)
  var location = req.body.autocomplete;
  
  db.all('SELECT * FROM advertisement where Location = ? ',[location], (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('Error retrieving tasks');
    } else {
      console.log(rows);
      res.render("main.ejs", { flashMessage: req.flash('success') ,user: req.session.user,roll:req.session.roll , name:req.session.name ,Data:rows })

    }
  });
  // Render homepage with message (if present)
  // res.sendFile(__dirname+'/views/login.ejs', { flashMessage: req.flash('success') });
  
});



app.get('/admin',  (req, res) => {
  // Set flash message (assuming successful login)
  console.log(req.session.roll);
  if(req.session.roll == 'admin'){
  db.all('SELECT * FROM Users;', (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('Error retrieving tasks');
    } else {
      console.log(rows);
      db.all('SELECT * FROM advertisement;', (err, Addrows) => {

        res.render("admin.ejs", { flashMessage: req.flash('success') ,user: req.session.user , name:req.session.name ,roll:req.session.roll,Data:rows,addv:Addrows });

      });

    }
  });}

  else{
    req.flash('success', 'you have to login !');
    res.redirect('/signin');
  }
  // Render homepage with message (if present)
  // res.sendFile(__dirname+'/views/login.ejs', { flashMessage: req.flash('success') });
  
});



app.post('/admin',urlencodedParser,  (req, res) => {
  //console.log();
  var name = req.body.name;
  var user = req.body.email;
  var password =req.body.password ;
  var roll = req.body.role;
  time = req.datetime;
  var flag = false;
  db.all('SELECT * FROM Users', (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('Error retrieving tasks');
    } else {

      rows.forEach(element => {
        console.log(element);
        if (element['username'] == user) {
          flag = true;

        }

      });

      if(flag){

        req.flash('success', 'type anther username !');
        res.redirect('/signup');
      }else{
    
         db.run(`INSERT INTO Users (username, password, name, roll) VALUES (?, ?,?,?)`, [user, password, name, roll], function(err) {
          if (err) {
            return console.log(err.message);
          }else{
          // get the last insert id
          console.log(`A row has been inserted with row id ${this.lastID}`);
          req.flash('success', 'user created !');
          res.redirect('/admin');
        }
        });
    
      }



    }
  });
  
  

});



app.get('/',  (req, res) => {
  // Set flash message (assuming successful login)
  console.log(req.session.user);
  
  db.all('SELECT * FROM advertisement  ', (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('Error retrieving tasks');
    } else {
      console.log(rows);
      res.render("main.ejs", { flashMessage: req.flash('success') ,user: req.session.user , name:req.session.name ,roll:req.session.roll,Data:rows })

    }
  });
  // Render homepage with message (if present)
  // res.sendFile(__dirname+'/views/login.ejs', { flashMessage: req.flash('success') });
  
});

app.get('/download/:id', (req, res) => {
  const imageId = req.params.id;
  console.log(imageId);
  const selectQuery = `SELECT imagename, image FROM advertisement WHERE id = ?`;
  console.log(selectQuery);
  db.get(selectQuery, [imageId], (err, row) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('Error downloading image.');
    } else if (!row) {
      res.status(404).send('Image not found.');
    } else {
      //res.setHeader('Content-Type', 'image/jpeg'); // Adjust for image type based on data
      res.contentType(row.imagename.split('.')[1])
      res.send(row.image);
    }
  });
});

app.get('/deleteAds/:id', (req, res) => {
  const imageId = req.params.id;
  
  const selectQuery = `delete from advertisement WHERE id = ?`;
  console.log(selectQuery);
  db.get(selectQuery, [imageId], (err, row) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('Error delete ads.');
    } else {
      //res.setHeader('Content-Type', 'image/jpeg'); // Adjust for image type based on data
      req.flash('success', 'Advertisement Deleted!');
      if(req.session.roll=='admin'){
        res.redirect('/admin');
      }else{res.redirect('/user');}
      
    }
  });
});

app.get('/user',  (req, res) => {
  // Set flash message (assuming successful login)
  if(req.session.user){
  console.log(req.session.user);
  var q ="";
  if(req.session.roll=='admin'){q =" Rental House";}
  else{q =req.session.user;}
  db.all('SELECT * FROM advertisement WHERE username = ? ', [q], (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('Error retrieving tasks');
    } else {
      console.log(rows);
      res.render("user.ejs", { flashMessage: req.flash('success') ,user: req.session.user , name:req.session.name ,Data:rows })

    }
  });
  // Render homepage with message (if present)
  // res.sendFile(__dirname+'/views/login.ejs', { flashMessage: req.flash('success') });

}
  else{

    req.flash('success', 'you have to login !');
    res.redirect('/signin');
  }
});


app.get('/signin',  (req, res) => {
  // Set flash message (assuming successful login)
  console.log(req.session.user);
  
  // Render homepage with message (if present)
  // res.sendFile(__dirname+'/views/login.ejs', { flashMessage: req.flash('success') });
  res.render("login.ejs", { flashMessage: req.flash('success') })
});
app.get('/signup',  (req, res) => {
  // Set flash message (assuming successful login)
  //req.flash('success', 'Create Account!');
  
  // Render homepage with message (if present)
  // res.sendFile(__dirname+'/views/login.ejs', { flashMessage: req.flash('success') });
  res.render("signup.ejs", { flashMessage: req.flash('success') })
});



app.post('/user', upload.single('inputGroupFile'), (req, res) => {
 
  console.log(req.body);
  if (req.file) {
if(req.session.user){
  var imageData = req.file.buffer;
  var imageName = req.file.originalname;
  db.run("CREATE TABLE IF NOT EXISTS advertisement (id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT NOT NULL,name TEXT NOT NULL,imagename TEXT NOT NULL,image BLOB NOT NULL,size NUMERIC NOT NULL ,room NUMERIC NOT NULL ,phone TEXT NOT NULL ,Location TEXT NOT NULL ,price NUMERIC NOT NULL ,Description TEXT NOT NULL)" , function(err){
    if (err) {
      return console.log(err.message);
    }else{
      if(req.session.roll=='admin'){
        db.run(`INSERT INTO advertisement (username,name,imagename,image,size ,room ,phone ,Location ,price,Description) VALUES (?,?,?,? ,?,? ,? ,? ,?,?)`, [' Rental House','advertisement',imageName,imageData,req.body.size ,req.body.Room ,req.body.Phone ,req.body.autocomplete  ,req.body.Price ,req.body.Description], function(err) {
          if (err) {
            return console.log(err.message);
          }else{
          // get the last insert id
          console.log(`A row has been inserted with row id ${this.lastID}`);}
          req.flash('success', 'advertisement has been created sucssfuly!');
          res.redirect('/user');
        });
  
      }else{
        db.run(`INSERT INTO advertisement (username,name,imagename,image,size ,room ,phone ,Location ,price,Description) VALUES (?,?,?,? ,?,? ,? ,? ,?,?)`, [req.session.user,req.session.name,imageName,imageData,req.body.size ,req.body.Room ,req.body.Phone ,req.body.autocomplete  ,req.body.Price ,req.body.Description], function(err) {
          if (err) {
            return console.log(err.message);
          }else{
          // get the last insert id
          console.log(`A row has been inserted with row id ${this.lastID}`);}
          req.flash('success', 'advertisement has been created sucssfuly!');
          res.redirect('/user');
        });
  

      }
       
    }


  });
    
}else{
  req.flash('success', 'you have to login !');
        res.redirect('/signup');
}

} 
 
});


app.post('/editDeleteUser',urlencodedParser,  (req, res) => {
  console.log(req.body.userId);

  if (req.body.ActionType == 'delete') {
    db.get("delete from Users where id = ?", [req.body.userId], (err, row) => {
      if (err) {
        console.error(err.message);
        res.status(500).send('Error delete ads.');
      } else {
        //res.setHeader('Content-Type', 'image/jpeg'); // Adjust for image type based on data
        req.flash('success', 'User Deleted!');
        res.send("done");
      }
    });
  } else if (req.body.ActionType === 'edit') {

    db.get("UPDATE  Users  SET [name] = ? ,[password] = ?  WHERE id = ?", [req.body.name,req.body.password, req.body.userId], (err, row) => {
      if (err) {
        console.error(err.message);
        res.status(500).send('Error delete ads.');
      } else {
        //res.setHeader('Content-Type', 'image/jpeg'); // Adjust for image type based on data
        req.flash('success', 'User Updated!');
        res.send("done");
      }
    });
  }
  

});




app.post('/signup',urlencodedParser,  (req, res) => {
  //console.log();
  var name = req.body.name;
  var user = req.body.username;
  var password =req.body.password ;
  var ip_address = req.ip;
  time = req.datetime;
  var flag = false;
  db.all('SELECT * FROM Users', (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('Error retrieving tasks');
    } else {

      rows.forEach(element => {
        console.log(element);
        if (element['username'] == user) {
          flag = true;

        }

      });

      if(flag){

        req.flash('success', 'type anther username !');
        res.redirect('/signup');
      }else{
    
         db.run(`INSERT INTO Users (username, password, name, roll) VALUES (?, ?,?,?)`, [user, password, name, "user"], function(err) {
          if (err) {
            return console.log(err.message);
          }else{
          // get the last insert id
          console.log(`A row has been inserted with row id ${this.lastID}`);
          req.session.user = user;
          req.session.password = password;
          req.session.name = name;
          req.session.roll = "user";
          res.redirect('/');
        }
        });
    
      }



    }
  });
  
  

});
app.post('/auth',urlencodedParser, (req, res) => {
  //console.log();
  console.log(req.body.username)
  var user = req.body.username;
  var password =req.body.password ;
  var ip_address = req.ip;
  time = req.datetime;
  
  //

var flag = true;
  db.all('SELECT * FROM Users', (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('Error retrieving tasks');
    } else {
      
      rows.forEach(element => {
        console.log(element);
        if (element['username'] == user && element['password'] == password ){
          req.session.user = user;
          req.session.password = password;
          req.session.name = element['name'];
          req.session.roll = element['roll'];
          if(element['roll']== 'admin'){
            // create admin page
            flag=false;
            res.redirect('/');
          
          }
          else if (element['roll']== 'user'){
            // create user page
            flag=false;
            res.redirect('/');
          }
          
        }
        
      
      });
      if(flag){
        req.flash('success', 'bad user name or password!');
        res.redirect('/signin');
      }
      //res.json(rows);
    }
  });
    

});






app.listen(3000,   () => {
  
  console.log('Server listening on port 3000');
  


  db.get('SELECT name FROM sqlite_master WHERE type = ? AND name = ?', ['table', 'Users'],  (err, row) => {
    if (err) {
      console.error(err);
      


    } else {
      const tableExists = row !== undefined;
      console.log(`Table 'Users' exists: ${tableExists}`);

      if(tableExists){
        console.log("working ok ....... ");
      }
      else{
        console.log("Table user does not exist");
          db.run("CREATE TABLE IF NOT EXISTS Users (id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT NOT NULL,password TEXT NOT NULL,name TEXT NOT NULL,roll TEXT NOT NULL)" , function(err){
          if (err) {
            return console.log(err.message);
          }else{

             db.run(`INSERT INTO Users (username, password, name, roll) VALUES (?, ?,?,?)`, ["mohamed@test.com", "123", "mohamed", "admin"], function(err) {
              if (err) {
                return console.log(err.message);
              }else{
              // get the last insert id
              console.log(`A row has been inserted with row id ${this.lastID}`);}
            });

          }


        });
      
        
        
      
      }
    }
  });


  
 
  


});
