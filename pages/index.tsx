import { useState, useEffect, useMemo } from "react";
import type { NextPage } from "next";
// 接続中のネットワークを取得するため useNetwork を新たにインポートします。
import { ConnectWallet, ChainId, useNetwork, useAddress, useContract } from "@thirdweb-dev/react";
import styles from "../styles/Home.module.css";
import { Proposal } from "@thirdweb-dev/sdk";
import { AddressZero } from "@ethersproject/constants";

const Home: NextPage = () => {
  const address = useAddress();
  console.log("👋Wallet Address: ", address);

  const [network, switchNetwork] = useNetwork();

  // コントラクトオブジェクトを初期化（NFT/ガバナンストークン/投票コントラクト）
  const editionDrop = useContract("0xB74583E75aF5DcfF024d0FD1C1F6Ec862f9Dca60", "edition-drop").contract;
  const token = useContract("0xb9910CDb772fAb91140063d1da94c0316395c7b0", "token").contract;
  const vote = useContract("0x720A70fb09a20d2F17E6022733Ce3a998755238E", "vote").contract;

  // ステート管理を定義
  const [hasClaimedNFT, setHasClaimedNFT] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [memberTokenAmounts, setMemberTokenAmounts] = useState<any>([]);
  const [memberAddresses, setMemberAddresses] = useState<string[] | undefined>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  // アドレスの長さを省略してくれる便利な関数
  const shortenAddress = (str: string) => {
    return str.substring(0, 6) + "..." + str.substring(str.length - 4);
  };

  // コントラクトから既存の提案を全て取得
  useEffect(() => {
    if (!hasClaimedNFT) {
      return;
    }

    // vote!.getAll() を使用して提案を取得
    const getAllProposals = async () => {
      try {
        const proposals = await vote!.getAll();
        setProposals(proposals);
        console.log("🌈 Proposals:", proposals);
      } catch (error) {
        console.log("failed to get proposals", error);
      }
    };
    getAllProposals();
  }, [hasClaimedNFT, vote]);

  // ユーザーがすでに投票したかどうか確認
  useEffect(() => {
    if (!hasClaimedNFT) {
      return;
    }

    // 提案を取得し終えない限り、ユーザーが投票したかどうかを確認することができない
    if (!proposals.length) {
      return;
    }

    const checkIfUserHasVoted = async () => {
      try {
        const hasVoted = await vote!.hasVoted(proposals[0].proposalId.toString(), address);
        setHasVoted(hasVoted);
        if (hasVoted) {
          console.log("🥵 User has already voted");
        } else {
          console.log("🙂 User has not voted yet");
        }
      } catch (error) {
        console.error("Failed to check if wallet has voted", error);
      }
    };
    checkIfUserHasVoted();

  }, [hasClaimedNFT, proposals, address, vote]);

  // メンバーシップを保持しているメンバーの全アドレスを取得します
  useEffect(() => {
    if (!hasClaimedNFT) {
      return;
    }

    // 先ほどエアドロップしたユーザーがここで取得できます（発行された tokenID 0 のメンバーシップ NFT）
    const getAllAddresses = async () => {
      try {
        const memberAddresses = await editionDrop?.history.getAllClaimerAddresses(
          0
        );
        setMemberAddresses(memberAddresses);
        console.log("🚀 Members addresses", memberAddresses);
      } catch (error) {
        console.error("failed to get member list", error);
      }
    };
    getAllAddresses();
  }, [hasClaimedNFT, editionDrop?.history]);

  // 各メンバーが保持するトークンの数を取得します
  useEffect(() => {
    if (!hasClaimedNFT) {
      return;
    }

    const getAllBalances = async () => {
      try {
        const amounts = await token?.history.getAllHolderBalances();
        setMemberTokenAmounts(amounts);
        console.log("👜 Amounts", amounts);
      } catch (error) {
        console.error("failed to get member balances", error);
      }
    };
    getAllBalances();
  }, [hasClaimedNFT, token?.history]);

  // memberAddresses と memberTokenAmounts を 1 つの配列に結合します
  const memberList = useMemo(() => {
    return memberAddresses?.map((address) => {
      // memberTokenAmounts 配列でアドレスが見つかっているかどうかを確認します
      // その場合、ユーザーが持っているトークンの量を返します
      // それ以外の場合は 0 を返します
      const member = memberTokenAmounts?.find(({ holder }: {holder: string}) => holder === address);

      return {
        address,
        tokenAmount: member?.balance.displayValue || "0",
      };
    });
  }, [memberAddresses, memberTokenAmounts]);

  useEffect(() => {
    // もしウォレットに接続されていなかったら処理をしない
    if (!address) {
      return;
    }
    // ユーザーがメンバーシップ NFT を持っているかどうかを確認する関数を定義
    const checkBalance = async () => {
      try {
        const balance = await editionDrop!.balanceOf(address, 0);
        if (balance.gt(0)) {
          setHasClaimedNFT(true);
          console.log("🌟 this user has a membership NFT!");
        } else {
          setHasClaimedNFT(false);
          console.log("😭 this user doesn't have a membership NFT.");
        }
      } catch (error) {
        setHasClaimedNFT(false);
        console.error("Failed to get balance", error);
      }
    };
    // 関数を実行
    checkBalance();
  }, [address, editionDrop]);

  const mintNft = async () => {
    try {
      setIsClaiming(true);
      await editionDrop!.claim("0", 1);
      console.log(
        `🌊 Successfully Minted! Check it out on OpenSea: https://testnets.opensea.io/assets/${editionDrop!.getAddress()}/0`
      );
      setHasClaimedNFT(true);
    } catch (error) {
      setHasClaimedNFT(false);
      console.error("Failed to mint NFT", error);
    } finally {
      setIsClaiming(false);
    }
  };
  
  // ウォレットと接続していなかったら接続を促す
  if (!address) {
    return (
      <div className={styles.container}>
        <main className={styles.main}>
          <h1 className={styles.title}>
            Welcome to Tokyo Sauna Collective !!
          </h1>
          <div className={styles.connect}>
            <ConnectWallet />
          </div>
        </main>
      </div>
    );
  }
  // テストネットが Goerli ではなかった場合に警告を表示
  else if (address && network && network?.data?.chain?.id !== ChainId.Goerli) {
    console.log("wallet address: ", address);
    console.log("network: ", network?.data?.chain?.id);

    return (
      <div className={styles.container}>
        <main className={styles.main}>
          <h1 className={styles.title}>Goerli に切り替えてください⚠️</h1>
          <p>この dApp は Goerli テストネットのみで動作します。</p>
          <p>ウォレットから接続中のネットワークを切り替えてください。</p>
        </main>
      </div>
    );
  }
  // DAOメンバーにはダッシュボード画面を表示
  else if (hasClaimedNFT){
    return (
      <div className={styles.container}>
        <main className={styles.main}>
        <h1 className={styles.title}>🍪DAO Member Page</h1>
        <p>Congratulations on being a member</p>
          <div>
            <div>
              <h2>■ Member List</h2>
              <table className="card">
                <thead>
                  <tr>
                    <th>Address</th>
                    <th>Token Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {memberList!.map((member) => {
                    return (
                      <tr key={member.address}>
                        <td>{shortenAddress(member.address)}</td>
                        <td>{member.tokenAmount}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div>
              <h2>■ Active Proposals</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  // ダブルクリックを防ぐためにボタンを無効化します
                  setIsVoting(true);

                  // フォームから値を取得します
                  const votes = proposals.map((proposal) => {
                    const voteResult = {
                      proposalId: proposal.proposalId,
                      vote: 2,
                    };
                    proposal.votes.forEach((vote) => {
                      const elem = document.getElementById(
                        proposal.proposalId + "-" + vote.type
                      ) as HTMLInputElement;

                      if (elem!.checked) {
                        voteResult.vote = vote.type;
                        return;
                      }
                    });
                    return voteResult;
                  });

                  // ユーザーが自分のトークンを投票に委ねることを確認する必要があります
                  try {
                    // 投票する前にウォレットがトークンを委譲する必要があるかどうかを確認します
                    const delegation = await token!.getDelegationOf(address);
                    // トークンを委譲していない場合は、投票前に委譲します
                    if (delegation === AddressZero) {
                      await token!.delegateTo(address);
                    }
                    // 提案に対する投票を行います
                    try {
                      await Promise.all(
                        votes.map(async ({ proposalId, vote: _vote }) => {
                          // 提案に投票可能かどうかを確認します
                          const proposal = await vote!.get(proposalId);
                          // 提案が投票を受け付けているかどうかを確認します
                          if (proposal.state === 1) {
                            return vote!.vote(proposalId.toString(), _vote);
                          }
                          return;
                        })
                      );
                      try {
                        // 提案が実行可能であれば実行する
                        await Promise.all(
                          votes.map(async ({ proposalId }) => {
                            const proposal = await vote!.get(proposalId);

                            // state が 4 の場合は実行可能と判断する
                            if (proposal.state === 4) {
                              return vote!.execute(proposalId.toString());
                            }
                          })
                        );
                        // 投票成功と判定する
                        setHasVoted(true);
                        console.log("successfully voted");
                      } catch (err) {
                        console.error("failed to execute votes", err);
                      }
                    } catch (err) {
                      console.error("failed to vote", err);
                    }
                  } catch (err) {
                    console.error("failed to delegate tokens");
                  } finally {
                    setIsVoting(false);
                  }
                }}
              >
                {proposals.map((proposal) => (
                  <div key={proposal.proposalId.toString()} className="card">
                    <h5>{proposal.description}</h5>
                    <div>
                      {proposal.votes.map(({ type, label }) => (
                        <div key={type}>
                          <input
                            type="radio"
                            id={proposal.proposalId + "-" + type}
                            name={proposal.proposalId.toString()}
                            value={type}
                            // デフォルトで棄権票をチェックする
                            defaultChecked={type === 2}
                          />
                          <label htmlFor={proposal.proposalId + "-" + type}>
                            {label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <p></p>
                <button disabled={isVoting || hasVoted} type="submit">
                  {isVoting
                    ? "Voting..."
                    : hasVoted
                      ? "You Already Voted"
                      : "Submit Votes"}
                </button>
                <p></p>
                {!hasVoted && (
                  <small>
                    This will trigger multiple transactions that you will need to
                    sign.
                  </small>
                )}
              </form>
            </div>
          </div>
        </main>
      </div>
    );
  }
  // ウォレットと接続されていたら Mint ボタンを表示
  else {
    return (
      <div className={styles.container}>
        <main className={styles.main}>
          <h1 className={styles.title}>Mint your free 🍪DAO Membership NFT</h1>
          <button disabled={isClaiming} onClick={mintNft}>
            {isClaiming ? "Minting..." : "Mint your nft (FREE)"}
          </button>
        </main>
      </div>
    );
  }
};

export default Home;