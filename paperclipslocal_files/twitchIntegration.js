console.log('connected')
ComfyJS.Init("FrostyyPaws", oAuthToken)
ComfyJS.onReward = (user, reward, cost, message, extra) => {
    console.log(user, reward, cost, message, extra)
}
