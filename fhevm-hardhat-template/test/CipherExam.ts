import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { CipherExam, CipherExam__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { time } from "@nomicfoundation/hardhat-network-helpers";

type Signers = {
  deployer: HardhatEthersSigner;
  teacher: HardhatEthersSigner;
  student: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("CipherExam")) as CipherExam__factory;
  const contract = (await factory.deploy()) as CipherExam;
  const contractAddress = await contract.getAddress();
  return { contract, contractAddress };
}

describe("CipherExam", function () {
  let signers: Signers;
  let contract: CipherExam;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { 
      deployer: ethSigners[0], 
      teacher: ethSigners[1], 
      student: ethSigners[2] 
    };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }
    ({ contract, contractAddress } = await deployFixture());
  });

  describe("Exam Creation", function () {
    it("should create an exam successfully", async function () {
      const title = "Test Exam";
      const questionCount = 3;
      const passingScore = 60; // 60% passing threshold
      const questionScores = [30, 30, 40]; // Total 100 points
      const startTime = Math.floor(Date.now() / 1000) + 60; // 1 minute from now
      const endTime = startTime + 3600; // 1 hour later

      // Encrypt passing score
      const encryptedPassingScore = await fhevm
        .createEncryptedInput(contractAddress, signers.teacher.address)
        .add32(passingScore)
        .encrypt();

      const tx = await contract
        .connect(signers.teacher)
        .createExam(
          title,
          questionCount,
          encryptedPassingScore.handles[0],
          encryptedPassingScore.inputProof,
          questionScores,
          startTime,
          endTime
        );
      await tx.wait();

      // Verify exam was created
      const examInfo = await contract.getExamInfo(0);
      expect(examInfo.title).to.eq(title);
      expect(examInfo.questionCount).to.eq(questionCount);
      expect(examInfo.questionScores.length).to.eq(3);
      expect(examInfo.questionScores[0]).to.eq(30);
    });

    it("should reject invalid question count", async function () {
      const encryptedPassingScore = await fhevm
        .createEncryptedInput(contractAddress, signers.teacher.address)
        .add32(60)
        .encrypt();

      const startTime = Math.floor(Date.now() / 1000) + 60;
      const endTime = startTime + 3600;

      await expect(
        contract
          .connect(signers.teacher)
          .createExam(
            "Test",
            101, // Invalid: > 100
            encryptedPassingScore.handles[0],
            encryptedPassingScore.inputProof,
            [50, 50],
            startTime,
            endTime
          )
      ).to.be.revertedWith("Invalid question count");
    });
  });

  describe("Submit Answers", function () {
    let examId: bigint;
    const questionScores = [30, 30, 40];

    beforeEach(async function () {
      // Create an exam
      const currentTime = await time.latest();
      const startTime = currentTime + 10; // Starts in 10 seconds
      const endTime = currentTime + 3600; // Ends in 1 hour

      const encryptedPassingScore = await fhevm
        .createEncryptedInput(contractAddress, signers.teacher.address)
        .add32(60)
        .encrypt();

      const tx = await contract
        .connect(signers.teacher)
        .createExam(
          "Test Exam",
          3,
          encryptedPassingScore.handles[0],
          encryptedPassingScore.inputProof,
          questionScores,
          startTime,
          endTime
        );
      await tx.wait();

      // Move time forward to exam start time
      await time.increaseTo(startTime);

      examId = 0n;
    });

    it("should submit encrypted answers successfully", async function () {
      // Student scores: 25, 28, 35 = 88 total
      const scores = [25, 28, 35];

      // Encrypt all scores
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.student.address);
      
      for (const score of scores) {
        encryptedInput.add32(score);
      }
      const encrypted = await encryptedInput.encrypt();

      const tx = await contract
        .connect(signers.student)
        .submitAnswers(
          examId,
          encrypted.handles,
          encrypted.inputProof
        );
      await tx.wait();

      // Verify submission
      const submission = await contract.submissions(examId, signers.student.address);
      expect(submission.exists).to.be.true;
      expect(submission.submittedAt).to.be.gt(0);
    });

    it("should reject submission if exam not in progress", async function () {
      // Create an exam that hasn't started
      const currentTime = await time.latest();
      const startTime = currentTime + 3600; // Starts in 1 hour
      const endTime = startTime + 3600;

      const encryptedPassingScore = await fhevm
        .createEncryptedInput(contractAddress, signers.teacher.address)
        .add32(60)
        .encrypt();

      await contract
        .connect(signers.teacher)
        .createExam(
          "Future Exam",
          2,
          encryptedPassingScore.handles[0],
          encryptedPassingScore.inputProof,
          [50, 50],
          startTime,
          endTime
        );

      const scores = [40, 45];
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.student.address);
      scores.forEach(s => encryptedInput.add32(s));
      const encrypted = await encryptedInput.encrypt();

      await expect(
        contract
          .connect(signers.student)
          .submitAnswers(1n, encrypted.handles, encrypted.inputProof)
      ).to.be.revertedWith("Exam is not in progress");
    });
  });

  describe("Compute Total and Judge", function () {
    let examId: bigint;
    const questionScores = [30, 30, 40];

    beforeEach(async function () {
      // Create and submit
      const currentTime = await time.latest();
      const startTime = currentTime + 10; // Starts in 10 seconds
      const endTime = currentTime + 3600;

      const encryptedPassingScore = await fhevm
        .createEncryptedInput(contractAddress, signers.teacher.address)
        .add32(60)
        .encrypt();

      await contract
        .connect(signers.teacher)
        .createExam(
          "Test Exam",
          3,
          encryptedPassingScore.handles[0],
          encryptedPassingScore.inputProof,
          questionScores,
          startTime,
          endTime
        );

      // Move time forward to exam start time
      await time.increaseTo(startTime);

      examId = 0n;

      // Submit answers: 25, 28, 35 = 88 total
      const scores = [25, 28, 35];
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.student.address);
      scores.forEach(s => encryptedInput.add32(s));
      const encrypted = await encryptedInput.encrypt();

      await contract
        .connect(signers.student)
        .submitAnswers(examId, encrypted.handles, encrypted.inputProof);
    });

    it("should compute total score and judge pass/fail in encrypted state", async function () {
      // Compute total and judge
      const tx = await contract
        .connect(signers.student)
        .computeTotalAndJudge(examId, signers.student.address);
      await tx.wait();

      // Get encrypted total
      const encryptedTotal = await contract.getMyEncryptedTotal(examId, signers.student.address);
      
      // Decrypt total (should be 88)
      const clearTotal = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedTotal,
        contractAddress,
        signers.student
      );
      expect(clearTotal).to.eq(88);

      // Get encrypted pass status
      const encryptedPassed = await contract.getMyPassedStatus(examId, signers.student.address);
      
      // Decrypt pass status (88 >= 60, should be true)
      const clearPassed = await fhevm.userDecryptEbool(
        encryptedPassed,
        contractAddress,
        signers.student
      );
      expect(clearPassed).to.be.true;
    });

    it("should correctly identify failing score", async function () {
      // Another student with failing score: 20, 20, 15 = 55 total (< 60)
      const failingScores = [20, 20, 15];
      const encryptedInput = await fhevm
        .createEncryptedInput(contractAddress, signers.teacher.address);
      failingScores.forEach(s => encryptedInput.add32(s));
      const encrypted = await encryptedInput.encrypt();

      await contract
        .connect(signers.teacher)
        .submitAnswers(examId, encrypted.handles, encrypted.inputProof);

      await contract
        .connect(signers.teacher)
        .computeTotalAndJudge(examId, signers.teacher.address);

      const encryptedPassed = await contract.getMyPassedStatus(examId, signers.teacher.address);
      const clearPassed = await fhevm.userDecryptEbool(
        encryptedPassed,
        contractAddress,
        signers.teacher
      );
      expect(clearPassed).to.be.false;
    });
  });
});


