const User = require('../models/userModel.js');





exports.createUser = (req, res, next) => {

    const user = new User({
      surname: req.body.surname,
    });
    user.save().then(
      (savedUser) => {
        res.json({ success: true, id: savedUser._id });
        
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

exports.updateUserSurname = async (req, res) => {
   
  
    try {
      // Recherchez l'utilisateur dans la base de données par ID
      const user = await User.findById(req.params.id);
  
      // Vérifiez si l'utilisateur existe
      if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }
  
     
      user.surname = req.body.surname;
  
      // Enregistrez les modifications dans la base de données
      await user.save();
  
      // Répondez avec les détails mis à jour de l'utilisateur
      res.json({ success: true, user });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du surnom :', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  };
