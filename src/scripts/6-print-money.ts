import sdk from "./1-initialize-sdk.js";

// これは、前のステップで取得した私たちの ERC-20 コントラクトのアドレスです。
const token = sdk.getContract("0xb9910CDb772fAb91140063d1da94c0316395c7b0", "token");

(async () => {
  try {
    // // 設定したい最大供給量を設定
    const amount = 1000000;
    // デプロイされた ERC-20 コントラクトを通して、トークンをミント
    await (await token).mint(amount);
    const totalSupply = await (await token).totalSupply();

    // 今、私たちのトークンがどれだけあるかを表示
    console.log(
      "✅ There now is",
      totalSupply.displayValue,
      "$TSC in circulation"
    );
  } catch (error) {
    console.error("Failed to print money", error);
  }
})();