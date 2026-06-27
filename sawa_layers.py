import tensorflow as tf
from tensorflow.keras import layers


@tf.keras.utils.register_keras_serializable(package="sawa_asl")
class AttentionPooling1D(layers.Layer):
    """Sums a (batch, T, features) tensor over the time axis. Must be
    imported (for its registration side effect) before calling
    tf.keras.models.load_model() on sawa_asl_model.keras in any other
    process/script."""

    def call(self, inputs):
        return tf.reduce_sum(inputs, axis=1)

    def compute_output_shape(self, input_shape):
        return (input_shape[0], input_shape[2])
