import 'package:flutter_riverpod/flutter_riverpod.dart';

class SignupFlowState {
  final String email;
  final String password;
  final String fullName;
  final String phone;
  final String invitationToken;

  const SignupFlowState({
    this.email = '',
    this.password = '',
    this.fullName = '',
    this.phone = '',
    this.invitationToken = '',
  });

  SignupFlowState copyWith({
    String? email,
    String? password,
    String? fullName,
    String? phone,
    String? invitationToken,
  }) {
    return SignupFlowState(
      email: email ?? this.email,
      password: password ?? this.password,
      fullName: fullName ?? this.fullName,
      phone: phone ?? this.phone,
      invitationToken: invitationToken ?? this.invitationToken,
    );
  }
}

class SignupFlowController extends StateNotifier<SignupFlowState> {
  SignupFlowController() : super(const SignupFlowState());

  void setStep1({
    required String email,
    required String password,
    required String fullName,
    required String phone,
    required String invitationToken,
  }) {
    state = state.copyWith(
      email: email,
      password: password,
      fullName: fullName,
      phone: phone,
      invitationToken: invitationToken,
    );
  }

  void clear() => state = const SignupFlowState();
}

final signupFlowProvider = StateNotifierProvider<SignupFlowController, SignupFlowState>((ref) {
  return SignupFlowController();
});
