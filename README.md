# game-status-discordbot-selfhosted
self hosted version of game status discord bot

![Screenshot](https://i.ibb.co/s1SCHhp/image.png)
### Contribution
- Author - [Ramzi-Sah](https://github.com/Ramzi-Sah)
- Fix Error (DeprecationWarning) - [xMin3S](https://github.com/xMin3S)
- Fix Error (Graph and more) - [Rizkychi](https://github.com/rizkychi)

### How to invite bot to your Discord Server
Read this [article](https://help.pebblehost.com/en/article/how-to-invite-your-bot-to-a-discord-server-1asdlyg/)

### Installation
1. Perform as root user
    ```sh
    sudo su
    ```
2. Install NVM
    ```sh
    curl -sL https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh -o install_nvm.sh
    ```
    ```sh
    bash install_nvm.sh
    ```
    ```sh
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
    ```
    ```sh
    source ~/.bash_profile
    ```
    ```sh
    nvm install --lts
    ```
2. Verify NVM, NPM, and NODE version
    ```sh
    nvm -v
    ```
    ```sh
    npm -v
    ```
    ```sh
    node -v
    ````
3. Clone repository to your server
    ```sh
    git clone https://github.com/rizkychi/game-status-discordbot-selfhosted.git
    ```
    ```sh 
    cd game-status-discordbot-selfhosted
    ```
4. Perform installation
    ```sh
    npm install
    ```
5. Edit config (fill in the empty fields)
    ```sh
    nano src/config.json
    ````
6. Run Bot
    ```sh
    node src/index.js
    ```
    or run in background
     ```sh
    node src/index.js &
    ```
### Troubleshooting
If your label graph become square (▢▢▢▢▢▢▢)
try this
```sh
apt install fontconfig --reinstall
```
