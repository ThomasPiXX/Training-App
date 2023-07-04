///////////////////////////////////////////
//sqlite connection 
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('users.db');
/////////////////////////////////////
// express connection
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;
const session = require('express-session');
const cookieParser = require('cookie-parser');

app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use(cookieParser());
/////////////////////////////////////////////////////
// user body-parser middleware with extended option
app.use(bodyParser.urlencoded({ extended: true}));
app.use(bodyParser.json());
///////////////////////////////////////////
//csurf mid
const csrfProtection = csrf({ 
  cookie: {
    key: '_csrf-my-app',
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 3600 // 1hour
}});

const csrfProtMid = (req, res, next) => {
  //apply CSRF protection only on POST requests
  if (req.method === 'POST') {
    // add CSRF protection middleware
    return csrfProtection(req, res, next);
  }
  next();
}

app.use(csrfProtMid);

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

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

// Serialize the user object
passport.serializeUser((user, done) => {
  console.log('Serialized user:', user);
  done(null, user.user_name); // Assuming the user has a unique identifier, you can change it to the appropriate field
  });
  
  // Deserialize the user object
  passport.deserializeUser((username, done) => {
    db.get('SELECT * FROM users WHERE user_name = ?', [username], (error, row) => {
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
/////////////////////////////////////////////////////
//training function 
//training function 
function trainingTime(exerciseExp, exerciseTime, user, req, res) {
  console.log('exerciseTime:', exerciseTime);
  console.log('user before update:', user);

  let expAmount = exerciseExp * exerciseTime;
  user.userExp += expAmount;

  while (expAmount >= 10) {
    user.userExp = user.userExp - 10;
    user.userLvl = user.userLvl + 1;
    expAmount = expAmount - 10;
  }
  console.log('user after update:', user);

  // Update the req.user object (session)
  req.user.exp = user.userExp;
  req.user.lvl = user.userLvl;
  console.log(user);
  console.log('Level up has been executed properly');

  // Adding user lvl and experience to the database
  const updateLvl = 'UPDATE users SET user_lvl = ?, user_exp = ? WHERE user_name = ?';
  db.run(updateLvl, [user.userLvl, user.userExp, user.userName], (err) => {
    if (err) {
      console.error('Error updating user level in the database:', err);
      res.status(500).send('Error updating user level in the database');
    } else {
      console.log('SQL query executed successfully');
      res.redirect('dashboard');
    }
  });

  return user;
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
app.post('/userLevel', (req, res) => {
  if (req.user) {
    let user = {
      userName: req.user.name,
      userLvl: req.user.lvl,
      userExp: req.user.exp || 0
    };

    // Getting the exerciseTime value
    const { Time } = req.body;
    const exerciseTime = parseInt(Time);
    const exerciseExp = 1;

    // Calling the lvl updater
    user = trainingTime(exerciseExp, exerciseTime, user, req, res);

  }
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
app.post('/logout',(req, res) => {
  req.logout(function(err){
    if(err){
      console.log(err);
    }
  })
  console.log(req.user)
  res.render('login');

});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`)
});

