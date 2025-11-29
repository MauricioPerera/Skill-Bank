# Machine Learning Algorithms

Comprehensive guide to common machine learning algorithms.

## Supervised Learning Algorithms

### Linear Regression

Linear regression models the relationship between variables using a linear equation.

**Prerequisites:** Understanding of [[Basic Concepts#Linear Algebra]]

**Applications:**
- Price prediction
- Trend analysis
- Risk assessment

For practical implementation, see [Tutorial: Linear Regression](tutorials.md#linear-regression).

### Decision Trees

Decision trees split data based on feature values to make predictions.

**Advantages:**
- Easy to interpret
- Handles non-linear relationships
- No data normalization needed

Learn more about ensemble methods in [Random Forests](#random-forests).

### Random Forests

An ensemble of decision trees that reduces overfitting.

**Related:** Also see [Gradient Boosting](#gradient-boosting) for another ensemble approach.

### Neural Networks

For neural network architectures, see the [Introduction to Neural Networks](intro.md#neural-networks).

Deep architectures are covered in [[Deep Learning]].

## Unsupervised Learning Algorithms

### K-Means Clustering

Groups similar data points together.

**Implementation:** Check out [Clustering Tutorial](tutorials.md#clustering).

### Principal Component Analysis (PCA)

Dimensionality reduction technique that finds principal components.

**Mathematical foundation:** [[Basic Concepts#Linear Algebra]]

## Training Algorithms

### Gradient Descent

Optimization algorithm for finding function minima.

**Variants:**
- Batch gradient descent
- [Stochastic Gradient Descent](#sgd)
- Mini-batch gradient descent

See [Introduction](intro.md#supervised-learning) for context.

### Stochastic Gradient Descent

Updates parameters using individual training examples.

**Applications:** Training [Neural Networks](intro.md#neural-networks).

### Backpropagation

Computes gradients for neural network training using the chain rule.

**Theory:** Covered extensively in [Deep Learning Guide](deep-learning.md#training).

**Practice:** See [Neural Network Tutorial](tutorials.md#backpropagation).

## Evaluation Metrics

### Classification Metrics

- Accuracy
- Precision/Recall
- F1-Score
- ROC-AUC

Details in [[Model Evaluation]].

### Regression Metrics

- Mean Squared Error (MSE)
- R-squared
- Mean Absolute Error (MAE)

## Regularization

### L1 Regularization (Lasso)

Adds absolute value of weights to loss function.

**Effect:** Promotes sparsity in the model.

### L2 Regularization (Ridge)

Adds squared weights to loss function.

**Common use:** Preventing overfitting in [Linear Regression](#linear-regression).

For comparison, see [[Deep Learning#Regularization Techniques]].

## Next Steps

1. Review [Introduction](intro.md) for foundational concepts
2. Practice with [Tutorials](tutorials.md)
3. Explore [[Deep Learning]] for advanced methods

