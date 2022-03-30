console.log('connected')

let currentRewardsMemo = {}
let currentAvailableButtonsMemo = {}
let userClicks = {}
const streamerName = "KenAKAFrosty"
run();

async function run() {
    if (localStorage.userClicks) {
        userClicks = JSON.parse(localStorage.userClicks);
    }
    ComfyJS.onReward = (user, reward, cost, message, extra) => {
        handleRewardRedemption(user, reward, cost, message, extra)
    }
    ComfyJS.Init(streamerName, oAuthToken)
    await storeCurrentChannelRewardsInMemo();
    storeCurrentButtonsInMemo();
    await deleteAllCurrentChannelRewards();
    createChannelRewardForEachCurrentButton();
    setInterval(() => {
        const buttonsChanged = checkIfButtonsHaveChanged();
        if (buttonsChanged) {
            storeCurrentButtonsInMemo()
            adjustCurrentRewards();
        }
    }, 450)
}

function handleRewardRedemption(user, reward, cost, message, extra) {
    console.log(user, reward, cost, message, extra)
    if (user === streamerName) {return}

    //this is just tracking user clicks over time for fun leaderboard type stuff
    if (!userClicks[user]) { userClicks[user] = {} }
    if (!userClicks[user][reward]) {
        userClicks[user][reward] = 1
    } else {
        userClicks[user][reward]++
    }

    localStorage.userClicks = JSON.stringify(userClicks);

    //ok here's the actual juicy functionality
    const button = currentAvailableButtonsMemo[reward];
    button.click();
    animateUserClick(user, button);
}

async function storeCurrentChannelRewardsInMemo() {
    const rewards = await getCurrentEnabledChannelRewards();
    let updatedRewards = {}
    for (reward of rewards) {
        if (reward.is_enabled) {
            updatedRewards[reward.title] = reward;
        }
    }
    currentRewardsMemo = updatedRewards;
    return new Promise(resolve => resolve('done'))
}


async function getCurrentEnabledChannelRewards() {
    const rewards = await ComfyJS.GetChannelRewards(clientId);
    const enabled = rewards.filter(e => e.is_enabled)
    return new Promise(resolve => resolve(enabled))
}

function storeCurrentButtonsInMemo() {
    const buttons = getAllCurrentlyRenderedButtons();
    let updatedButtons = {}
    for (button of buttons) {
        const name = button.textContent;
        updatedButtons[name] = button;
    }
    currentAvailableButtonsMemo = updatedButtons;
}

function getAllCurrentlyRenderedButtons() {
    const buttons = Array.from(document.querySelectorAll('button'));
    const rendered = buttons.filter(e => e.offsetParent && !e.disabled);
    const mapped = rendered.map(e => { 
        if ( e.querySelector('span') ){ 
            return e.querySelector('span');
        } else { 
            return e;
        }
    })
    return mapped;
}


function shallowArraysAreEqual(array1, array2) {
    if (array1.length !== array2.length) { return false }
    for (element of array1) {
        if (!array2.includes(element)) { return false }
    }
    return true;
}

async function createChannelRewardForEachCurrentButton() {
    for (buttonName in currentAvailableButtonsMemo) {
        ComfyJS.CreateChannelReward(clientId, {
            title: buttonName,
            cost: "20",
            "background_color": "#FFFFFF"
        }).then(response => {
            currentRewardsMemo[response.title] = response
        })
    }
}

async function deleteAllCurrentChannelRewards() {
    let promises = [];
    for (rewardName in currentRewardsMemo) {
        promises.push(ComfyJS.DeleteChannelReward(clientId, currentRewardsMemo[rewardName].id));
        delete currentRewardsMemo[rewardName]
    }
    for (promise of promises) {
        await promise;
    }
    return new Promise(resolve => resolve('done'));
}

function checkIfButtonsHaveChanged() {
    const buttons = getAllCurrentlyRenderedButtons();
    const names = [];
    for (button of buttons) {
        names.push(button.textContent)
    };
    const hasChanged = !shallowArraysAreEqual(names, Object.keys(currentAvailableButtonsMemo))
    return hasChanged;
}

function animateUserClick(user, button) {
    const buttonPosition = button.getBoundingClientRect();
    const div = document.createElement('div');
    div.style.top = buttonPosition.top + buttonPosition.height - 2
    div.style.left = buttonPosition.left;
    div.textContent = user;
    div.classList.add('animated-user-name');
    div.style.backgroundColor = "black";
    setInOutDeleteAnimationBehavior(div);
    document.querySelector('body').appendChild(div);
    setTimeout(() => { div.classList.add('faded-in') }, 100)
}

function setInOutDeleteAnimationBehavior(element) {
    element.addEventListener("transitionend", () => {
        element.classList.remove('faded-in');
        element.addEventListener("transitionend", () => {
            element.remove();
        })
    })
}

function adjustCurrentRewards() {
    const buttonNames = Object.keys(currentAvailableButtonsMemo);
    const rewardNames = Object.keys(currentRewardsMemo);
    for (buttonName of buttonNames) {
        if (!rewardNames.includes(buttonName)) {
            ComfyJS.CreateChannelReward(clientId, {
                title: buttonName,
                cost: "20",
                "background_color": "#FFFFFF"
            }).then(response => {
                currentRewardsMemo[response.title] = response
            })
        }
    }

    for (rewardName of rewardNames){ 
        if (!buttonNames.includes(rewardName)){ 
            ComfyJS.DeleteChannelReward(clientId, currentRewardsMemo[rewardName].id)
            delete currentRewardsMemo[rewardName]
        }
    }

}
