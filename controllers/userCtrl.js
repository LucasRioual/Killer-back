const User = require('../models/userModel.js');
const Mission = require('../models/missionModel.js');


/* const addMission = () => {
  const mission = new Mission({
    message: "Tu dois tuer la personne qui t'a été assignée",
  });
  mission.save().then(
    (savedMission) => {
      console.log("Id de la mission créee : ", savedMission._id);
      return savedMission._id;
    }
  ).catch(
    (error) => {
      console.log(error);
    }
  );
} */

exports.createUser = (req, res, next) => {
    

    const user = new User({
      surname: req.body.surname,
    });
    user.save().then(
      (savedUser) => {
        console.log("Id de l'utilisateur créee : ", savedUser._id);
        res.json({ success: true, userId: savedUser._id });
        
      }
    ).catch(
      (error) => {
        res.status(400).json({
          error: error
        });
      }
    );
  };

  //Initialisation de la connexion socket
  //socket.join(code)
  //io.to(code).emit("sendListPlayer", listPlayer);
  exports.getSurname = (req, res, next) => {
  User.findOne({
    _id: req.params.id
  }).then(
    (user) => {
      res.json({ success: true, surname: user.surname });
    }
  ).catch(
    (error) => {
      res.status(404).json({
        error: error
      });
    }
  );
};

exports.updateUserSurname = (req, res) => {
  const userId = req.params.id;
  const newSurname = req.body.surname;
  console.log('New surname:', newSurname);

  User.findByIdAndUpdate(userId, { $set: { surname: newSurname } }, { new: true })
    .then((user) => {
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
      console.log('User surname updated:', user);

      res.json({ success: true, user });
    })
    .catch((error) => {
      console.error('Error updating user surname:', error);
      res.status(500).json({ error: error.message });
    });
};
  
  
  
    
