// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, ebool, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title CipherExam - Privacy-First Exam System
/// @author CipherExam dApp
/// @notice A decentralized exam system using FHEVM to encrypt scores and compute results in encrypted state
contract CipherExam is ZamaEthereumConfig {
    // ============ Structs ============
    
    struct Exam {
        string title;
        uint256 questionCount;
        euint32 passingScore;        // Encrypted passing score threshold
        uint32[] questionScores;    // Public score per question (max 100 per question)
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        address creator;
    }
    
    struct StudentSubmission {
        euint32[] scores;            // Encrypted scores for each question
        euint32 totalScore;           // Encrypted total score
        ebool isPassed;               // Encrypted pass/fail status
        uint256 submittedAt;
        bool exists;
    }
    
    // ============ State Variables ============
    
    /// @notice Counter for exam IDs, auto-increments on creation
    uint256 public nextExamId;
    mapping(uint256 => Exam) public exams;
    mapping(uint256 => mapping(address => StudentSubmission)) public submissions;
    mapping(uint256 => address[]) public examStudents;
    mapping(uint256 => mapping(address => bool)) public hasSubmitted;
    
    // ============ Events ============
    
    event ExamCreated(
        uint256 indexed examId,
        address indexed creator,
        string title,
        uint256 questionCount,
        uint256 startTime,
        uint256 endTime
    );
    
    event AnswersSubmitted(
        uint256 indexed examId,
        address indexed student,
        uint256 submittedAt
    );
    
    event TotalComputed(
        uint256 indexed examId,
        address indexed student
    );
    
    // ============ Modifiers ============
    
    modifier onlyActiveExam(uint256 examId) {
        require(exams[examId].isActive, "Exam does not exist");
        require(
            block.timestamp >= exams[examId].startTime && 
            block.timestamp <= exams[examId].endTime,
            "Exam is not in progress"
        );
        _;
    }
    
    // ============ Functions ============
    
    /// @notice Create a new exam
    /// @param title Exam title
    /// @param questionCount Number of questions (1-100)
    /// @param passingScore Encrypted passing score threshold
    /// @param questionScores Array of max scores per question (public)
    /// @param startTime Exam start timestamp
    /// @param endTime Exam end timestamp
    function createExam(
        string calldata title,
        uint256 questionCount,
        externalEuint32 passingScore,
        bytes calldata passingScoreProof,
        uint32[] calldata questionScores,
        uint256 startTime,
        uint256 endTime
    ) external {
        require(questionCount > 0 && questionCount <= 100, "Invalid question count");
        require(questionScores.length == questionCount, "Question scores length mismatch");
        require(endTime > startTime, "Invalid time range");
        require(startTime >= block.timestamp, "Start time must be in future");
        
        // Convert encrypted passing score
        euint32 encryptedPassingScore = FHE.fromExternal(passingScore, passingScoreProof);
        
        // Validate question scores (each <= 100)
        for (uint256 i = 0; i < questionScores.length; i++) {
            require(questionScores[i] > 0 && questionScores[i] <= 100, "Invalid question score");
        }
        
        uint256 examId = nextExamId++;
        exams[examId] = Exam({
            title: title,
            questionCount: questionCount,
            passingScore: encryptedPassingScore,
            questionScores: questionScores,
            startTime: startTime,
            endTime: endTime,
            isActive: true,
            creator: msg.sender
        });
        
        // Authorize creator to decrypt passing score
        FHE.allow(encryptedPassingScore, msg.sender);
        FHE.allowThis(encryptedPassingScore);
        
        emit ExamCreated(examId, msg.sender, title, questionCount, startTime, endTime);
    }
    
    /// @notice Submit encrypted answers (scores) for an exam
    /// @param examId The exam ID
    /// @param scores Array of encrypted scores (one per question)
    /// @param inputProof Proof for encrypted inputs
    function submitAnswers(
        uint256 examId,
        externalEuint32[] calldata scores,
        bytes calldata inputProof
    ) external onlyActiveExam(examId) {
        require(!hasSubmitted[examId][msg.sender], "Already submitted");
        require(scores.length == exams[examId].questionCount, "Score count mismatch");
        
        // Convert encrypted inputs
        euint32[] memory encryptedScores = new euint32[](scores.length);
        for (uint256 i = 0; i < scores.length; i++) {
            encryptedScores[i] = FHE.fromExternal(scores[i], inputProof);
            // Validate score doesn't exceed max for this question (in encrypted space)
            // Note: This is a simplified check. In production, you'd want to verify
            // that score <= questionScores[i] in encrypted space using FHE.le
            // For now, we rely on frontend validation
        }
        
        // Initialize submission
        submissions[examId][msg.sender] = StudentSubmission({
            scores: encryptedScores,
            totalScore: FHE.asEuint32(0), // Will be computed later
            isPassed: FHE.asEbool(false),
            submittedAt: block.timestamp,
            exists: true
        });
        
        // Authorize student to decrypt their own scores
        for (uint256 i = 0; i < encryptedScores.length; i++) {
            FHE.allow(encryptedScores[i], msg.sender);
            FHE.allowThis(encryptedScores[i]);
        }
        
        hasSubmitted[examId][msg.sender] = true;
        
        // Track student list
        examStudents[examId].push(msg.sender);
        
        emit AnswersSubmitted(examId, msg.sender, block.timestamp);
    }
    
    /// @notice Compute total score and judge pass/fail in encrypted state
    /// @param examId The exam ID
    /// @param student The student address (must be msg.sender or authorized)
    function computeTotalAndJudge(uint256 examId, address student) external {
        require(
            submissions[examId][student].exists,
            "No submission found"
        );
        require(
            student == msg.sender || exams[examId].creator == msg.sender,
            "Not authorized"
        );
        
        StudentSubmission storage submission = submissions[examId][student];
        
        // Compute total score in encrypted state
        euint32 total = FHE.asEuint32(0);
        for (uint256 i = 0; i < submission.scores.length; i++) {
            total = FHE.add(total, submission.scores[i]);
        }
        
        // Update total score and re-authorize
        submission.totalScore = total;
        FHE.allow(total, student);
        FHE.allowThis(total);
        
        // Judge pass/fail in encrypted state
        ebool passed = FHE.ge(total, exams[examId].passingScore);
        submission.isPassed = passed;
        
        // Authorize student to decrypt pass/fail status
        FHE.allow(passed, student);
        FHE.allowThis(passed);
        
        emit TotalComputed(examId, student);
    }
    
    /// @notice Get encrypted total score for a student
    /// @param examId The exam ID
    /// @param student The student address
    /// @return Encrypted total score
    function getMyEncryptedTotal(uint256 examId, address student) 
        external 
        view 
        returns (euint32) 
    {
        require(submissions[examId][student].exists, "No submission found");
        return submissions[examId][student].totalScore;
    }
    
    /// @notice Get encrypted pass/fail status for a student
    /// @param examId The exam ID
    /// @param student The student address
    /// @return Encrypted pass/fail status
    function getMyPassedStatus(uint256 examId, address student) 
        external 
        view 
        returns (ebool) 
    {
        require(submissions[examId][student].exists, "No submission found");
        return submissions[examId][student].isPassed;
    }
    
    /// @notice Get encrypted scores array for a student
    /// @param examId The exam ID
    /// @param student The student address
    /// @return Array of encrypted scores
    function getMyScores(uint256 examId, address student) 
        external 
        view 
        returns (euint32[] memory) 
    {
        require(submissions[examId][student].exists, "No submission found");
        return submissions[examId][student].scores;
    }
    
    /// @notice Get exam info (public fields)
    /// @param examId The exam ID
    function getExamInfo(uint256 examId) 
        external 
        view 
        returns (
            string memory title,
            uint256 questionCount,
            uint32[] memory questionScores,
            uint256 startTime,
            uint256 endTime,
            bool isActive,
            address creator
        ) 
    {
        Exam storage exam = exams[examId];
        require(exam.isActive, "Exam does not exist");
        return (
            exam.title,
            exam.questionCount,
            exam.questionScores,
            exam.startTime,
            exam.endTime,
            exam.isActive,
            exam.creator
        );
    }
    
    /// @notice Get exam status (for UI display)
    /// @param examId The exam ID
    /// @return status: 0 = not started, 1 = in progress, 2 = ended
    function getExamStatus(uint256 examId) external view returns (uint8) {
        Exam storage exam = exams[examId];
        if (!exam.isActive) return 0;
        if (block.timestamp < exam.startTime) return 0; // Not started
        if (block.timestamp > exam.endTime) return 2; // Ended
        return 1; // In progress
    }
    
    /// @notice Get list of students who submitted
    /// @param examId The exam ID
    /// @return Array of student addresses
    function getExamStudents(uint256 examId) external view returns (address[] memory) {
        return examStudents[examId];
    }
    
    /// @notice Get the next exam ID (total number of exams created)
    /// @return The next exam ID (which is also the total count)
    function getNextExamId() external view returns (uint256) {
        return nextExamId;
    }
}

