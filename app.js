/////////////////////////////////////
// express connection 
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;
const session = require('express-session');
app.use(express.urlencoded({extended: true}));
app.use(express.static('public'));

///////////////////////////////////////////
//sqlite connection 
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('users.db');
const insertQuery = 'INSERT INTO users (user_name, user_age, user_password) VALUES (?, ?, ?)';
const updateLvl = 'UPDATE users SET user_exp = ?, user_lvl = ? WHERE user_name = ?';
const logInQuery ='SELECT * FROM users WHERE user_name = ? AND user_password = ?';


/////////////////////////
//user model

class User {
  constructor(name, password, exp = 0, lvl = 0){
      this.name = name;
      this.password = password;
      this.exp = exp;
      this.lvl = lvl;
  }
}
/////////////////////////
//session config
app.use(session({
    secret:'your-secret-key',
    resave: false,
    saveUninitialized: false
}));
// Set view engine
app.set('view engine', 'ejs');
const path = require('path');
app.set('views', path.join(__dirname, 'view'));



//passport connection;
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');

//passport 

// Serialize the user object
passport.serializeUser((user, done) => {
  console.log('Serialized user:', user);
  done(null, user.user_name); // Assuming the user has a unique identifier, you can change it to the appropriate field
  });
  
  // Deserialize the user object
  passport.deserializeUser((user, done) => {
    db.get('SELECT * FROM users WHERE user_name = ?', [user], (error, row) => {
      if (error) {
        return done(error);
      }
      if (!row) {
        return done(null, false);
      }
      const user = {
        name: row.user_name,
        lvl: row.user_lvl,
        exp: row.user_exp
      };
      console.log('Deserialized User:', user);
      return done(null, user);
    });
  });
///////////////////////////////////////////////
//strategy
  passport.use(new LocalStrategy((username, password, done) => {
    db.get("SELECT * FROM users WHERE user_name = ?",[username], (error, rows) => {
      if (error) {
        return done(error);
      }
      if (!rows) {
        return done(null, false, { template: 'createAccount' });
      }

      bcrypt.compare(password, rows.user_password, (error, isMatch) => {
        if (error) {
          return done(error);
        }
        console.log(isMatch); // Log the result of the password comparison
        if (!isMatch) {
          return done(null, false, { template: 'createAccount' });
        }
        return done(null, rows ,{ template: 'dashboard' });
      });
    });
  }));
//////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////
// lvl up function 
function lvlUp(user){
    while(user.exp >= 10){
    const remExp = user.exp - 10;
    user.exp = remExp;
    user.lvl++;
    };
}
/////////////////////////////////////////////////////
// user body-parser middleware with extended option
app.use(bodyParser.urlencoded({ extended: true}));
app.use(bodyParser.json());
/////////////////////////////////////////////////////
//training function 
const exerciceExp = 1;

function trainingTime(exerciceExp,exerciceTime, user){
    let total = exerciceExp * exerciceTime;
    user.exp = total;
    return lvlUp(user) ;
}
//////////////////////////////////////////////////////
//hashing password function 

function passwordHasher(password, callback){

    if (!password) {
        const error = new Error('Invalid password');
        return callback(error);
    }
    //Generate a salt to use for hashing
    bcrypt.genSalt(10, (err, salt) =>{
        if (err) return callback(err);

        //hash the password using the generated salt 
        bcrypt.hash(password, salt, (err, hash) => {
            if (err) return callback(err);

            // invoke the callback
            callback(null, hash);
        })
    })
}
/////////////////////////////////////////////////////
//Acount creating form path

//path
app.get('/createAccount', (req, res) =>{
    res.render('createAccount');
})
app.post('/createAccount', (req, res) => {
    const { username, userPassword } = req.body;
  
    // check if user already exists
    db.get("SELECT * FROM users WHERE user_name=?", [username], function(error, row) {
      if (error) throw error;
  
      if (row) {
        console.log('User already exists');
        res.status(400).send('User already exists');
      } else {
        // call passwordHasher
        passwordHasher(userPassword, (error, hashedPassword) => {
            if(error){
                console.log('error hashing password', error);
                res.status(500).send('Error hashing password');
                return;
            }
          // Store the hashed password in the database
          db.run("INSERT INTO users (user_name, user_password,user_exp, user_lvl) VALUES (?, ?, ?, ?)", [username, hashedPassword, 0, 0], function(error) {
            if (error) throw error;
            console.log("User account added");
            res.redirect('/dashboard');
          });
        });
      }
    });
  });
//////////////////////////////////////////
//log in path

app.get('/', (req, res) =>{
    res.render('login');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res, next) => {
    passport.authenticate('local', (error, user, info) => {
      if (error) {
        return next(error);
      }
      if (!user) {
        return res.redirect('/createAccount');
      }
      req.login(user, (error) => {
        if (error) {
          return next(error);
        }
        return res.redirect('/dashboard');
      });
    })(req, res, next);
  });
/////////////////////////////////////////////
//Upadting user lvl


app.post('/userLevel', (req, res) =>{
    //getting UserID
    const userId = req.user;
    const userExperience = userId.exp;
    const userLvl = userId.lvl;
    //getting the exerciceTime value 
    const {Time} = req.body;
    exerciceTime = Time;
    
    
    //calling the lvl updater 
    trainingTime(exerciceExp, exerciceTime);

    console.log('lvl up as been executed properly');
    //adding user lvl and experience to Database
    db.run(updateLvl, [userId, userExperience, userLvl], (err) => {
        if(err) {
            console.error('Error updating user level in the database:', err);
            res.status(500).send('Error updating user level in the database');
        } else {
            console.log('SQL query executed successfully');
            res.redirect('dashboard');
        }
    });
});

//////////////////
//dashboard route 
app.get('/dashboard', (req, res) => {
  if (req.user) {
    const user = req.user;
    res.render('dashboard', { user });
  } else {
    res.redirect('/login');
  }
});


//////////////////////////////
// log out path 

app.get('/logout', (req, res) =>{
    res.render('login');
    
}) 
///////////////////

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`)
});

