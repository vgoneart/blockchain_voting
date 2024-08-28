const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Voting", function () {
  async function deployVotingFixture() {
    const [owner, voter1, voter2] = await ethers.getSigners();
    const candidateNames = ["Alice", "Bob", "Charlie"];
    const votingDuration = 30; // 30 minutes

    const Voting = await ethers.getContractFactory("Voting");
    const voting = await Voting.deploy(candidateNames, votingDuration);

    return { voting, owner, voter1, voter2, candidateNames, votingDuration };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { voting, owner } = await loadFixture(deployVotingFixture);
      expect(await voting.owner()).to.equal(owner.address);
    });

    it("Should initialize candidates correctly", async function () {
      const { voting, candidateNames } = await loadFixture(deployVotingFixture);
      const candidates = await voting.getAllVotesOfCandiates();
      expect(candidates.length).to.equal(candidateNames.length);
      for (let i = 0; i < candidateNames.length; i++) {
        expect(candidates[i].name).to.equal(candidateNames[i]);
        expect(candidates[i].voteCount).to.equal(0);
      }
    });
  });

  describe("Voting", function () {
    it("Should allow a voter to cast a vote", async function () {
      const { voting, voter1 } = await loadFixture(deployVotingFixture);
      await voting.connect(voter1).vote(0);
      const candidates = await voting.getAllVotesOfCandiates();
      expect(candidates[0].voteCount).to.equal(1);
    });

    it("Should not allow a voter to vote twice", async function () {
      const { voting, voter1 } = await loadFixture(deployVotingFixture);
      await voting.connect(voter1).vote(0);
      await expect(voting.connect(voter1).vote(1)).to.be.revertedWith("You have already voted.");
    });
  });

  describe("Candidate Management", function () {
    it("Should allow the owner to add a new candidate", async function () {
      const { voting, owner } = await loadFixture(deployVotingFixture);
      await voting.connect(owner).addCandidate("David");
      const candidates = await voting.getAllVotesOfCandiates();
      expect(candidates.length).to.equal(4);
      expect(candidates[3].name).to.equal("David");
    });

    it("Should not allow non-owners to add a candidate", async function () {
      const { voting, voter1 } = await loadFixture(deployVotingFixture);
      await expect(voting.connect(voter1).addCandidate("Eve")).to.be.reverted;
    });
  });

  describe("Voting Status", function () {
    it("Should return correct voting status", async function () {
      const { voting, votingDuration } = await loadFixture(deployVotingFixture);
      expect(await voting.getVotingStatus()).to.be.true;

      await time.increase(votingDuration * 60 + 1);
      expect(await voting.getVotingStatus()).to.be.false;
    });

    it("Should return correct remaining time", async function () {
      const { voting, votingDuration } = await loadFixture(deployVotingFixture);
      const remainingTime = await voting.getRemainingTime();
      expect(remainingTime).to.be.closeTo(BigInt(votingDuration * 60), BigInt(5)); // Allow 5 seconds tolerance

      await time.increase(votingDuration * 60 + 1);
      expect(await voting.getRemainingTime()).to.equal(0);
    });
  });
});
