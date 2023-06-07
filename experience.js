//sqlite connection 
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('user.db');
const insertQuery = 'INSERT INTO users (user_name, user_age) VALUES (?, ?)';
const updateLvl = 'UPDATE users SET user_exp = ?, user_lvl = ? WHERE user_name = ?';
const logIn = 'SELECT * FROM users WHERE user_name = ? AND user_age = ?';
//////////////////////////////////////////////////////////////////
//user referennce
const user = {
    name:"",
    age:"",
    exp:0,
    lvl:0
};
////////////////////////////////////////////////////
// lvl up function 
function lvlUp(){
    while(user.exp >= 10){
    const remExp = user.exp - 10;
    user.exp = remExp;
    user.lvl++;
    };
}
/////////////////////////////////////////////////////
//training function 
const exerciceExp = 1;
let exerciceTime = NaN;

function trainingTime(exerciceExp,exerciceTime){
    let total = exerciceExp * exerciceTime;
    user.exp = total;
    return lvlUp(user.exp) ;
}
///////////////////////////////////////////////////
//log in function 
function login(){
    console.log("please create an Account :)");  
            rl.question('Enter your name: ', (name) => {
                user.name = name;
                rl.question("Enter age:? ", (age) => {
                    user.age = age;
                    db.run(insertQuery, [user.name, user.age], function (error){
                        if (error) throw error;
                        console.log("User have been add to the database");
                        welcome()
                    })
                    })
              });
}
//////////////////////////////////////////////////////
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
//////////////////////////////////////////////////////
 //welcome function 
function welcome(){
    rl.question("Did you have an account? (yes/no): ",  (choice) => {
        if (choice.toLowerCase() === 'yes' || choice.toLowerCase() ==='y')
        {
            rl.question("What is your name?:",(username) =>{
                rl.question("what is your age?",(age) =>{
                    db.get(logIn, [username, age], (error, row) => {
                        if (error) throw error;
                        if (row) {
                            user.name = row.user_name;
                            user.age = row.user_age;
                            user.exp = row.user_exp;
                            user.lvl = row.user_lvl;
                            console.log("User information have retrieved:");
                            console.log("Username : " + user.name);
                            rl.question("Did you want to Update your User Profil?  (yes/no): ", (choice)=>{
                                if(choice.toLowerCase() === 'yes' || choice.toLowerCase() === 'y')
                                rl.question("How much hour did you train today? ", (hour) =>
                                {
                                    exerciceTime = hour;
                                    trainingTime(exerciceExp, exerciceTime);
                                    db.run(updateLvl, [user.exp, user.lvl, user.name], function   (error){
                                        if(error) throw error;
                                        console.log('User information have been Updated ');
                                        console.log (user.name + " you are Lvl : " + user.lvl + "  and exp : " + user.exp );
                                        console.log("Bye bye ");
                                        rl.close()
                                        
                                   })
                                })
                        
                            })
                        }
                        else{
                            console.log("nothing found please create an Account ");
                            welcome();
                        }
                    })
                })
            })
        }
        else
        {
            login();
        }

    })
}
console.log("welcome to your Training Tracker");
welcome();
